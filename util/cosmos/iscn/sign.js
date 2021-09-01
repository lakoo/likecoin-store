// eslint-disable-next-line import/no-extraneous-dependencies
import BigNumber from 'bignumber.js';
import { Registry } from '@cosmjs/proto-signing';
import { MsgCreateIscnRecord } from '@likecoin/iscn-message-types/dist/iscn/tx';
import {
  defaultRegistryTypes,
  assertIsBroadcastTxSuccess,
  SigningStargateClient,
} from '@cosmjs/stargate';
import jsonStringify from 'fast-json-stable-stringify';

import {
  ISCN_RPC_URL, ISCN_PUBLISHERS, ISCN_LICENSES,
  ISCN_REGISTRY_NAME,
} from './constant';
import {
  EXTERNAL_URL,
  GAS_ESTIMATOR_BUFFER,
  GAS_ESTIMATOR_SLOP,
  GAS_ESTIMATOR_INTERCEPT,
  COSMOS_DENOM,
} from '../../../constant';
import { queryFeePerByte } from './query';
import { DEFAULT_GAS_PRICE_NUMBER } from '../../CosmosHelper';

const registry = new Registry([
  ...defaultRegistryTypes,
  ['/likechain.iscn.MsgCreateIscnRecord', MsgCreateIscnRecord], // Replace with your own type URL and Msg class
]);

function getPublisherISCNPayload(user, { publisher, license }) {
  const {
    userId,
    displayName,
  } = user;
  let usageInfo;
  const stakeholders = [];
  switch (publisher) {
    case 'matters': {
      const {
        description,
        id,
        name,
        license: mattersLicense,
      } = ISCN_PUBLISHERS.matters;
      stakeholders.push(Buffer.from(JSON.stringify({
        entity: {
          id,
          name,
          description,
        },
        rewardProportion: 0,
        contributionType: 'http://schema.org/publisher',
      }), 'utf8'));
      usageInfo = `ipfs://${ISCN_LICENSES[mattersLicense]['/']}`;
    }
    // eslint-disable-next-line no-fallthrough
    default: {
      switch (license) {
        default:
          if (!usageInfo) usageInfo = `ipfs://${ISCN_LICENSES.default['/']}`;
      }
      stakeholders.unshift(Buffer.from(JSON.stringify({
        entity: {
          id: `${EXTERNAL_URL}/${userId}`,
          name: displayName,
        },
        rewardProportion: 1,
        contributionType: 'http://schema.org/author',
      }), 'utf8'));
      break;
    }
  }
  return {
    usageInfo,
    stakeholders,
  };
}

function formatISCNPayload(payload, version = 1) {
  const {
    userId,
    displayName,
    cosmosWallet,
    fingerprint,
    name,
    tags,
    type,
    license,
    publisher,
    description,
    url,
  } = payload;

  let actualType = 'CreativeWork';

  const { usageInfo, stakeholders } = getPublisherISCNPayload({
    userId,
    displayName,
    cosmosWallet,
  }, { publisher, license });

  switch (type) {
    case 'image':
    case 'photo':
    case 'article': {
      actualType = type[0].toUpperCase().concat(type.slice(1));
      break;
    }
    default: actualType = 'CreativeWork';
  }

  const contentFingerprints = [];
  if (fingerprint) contentFingerprints.push(`ipfs://${fingerprint}`);
  const contentMetadata = {
    '@context': 'http://schema.org/',
    '@type': actualType,
    name,
    description,
    version,
    url,
    keywords: tags.join(','),
    usageInfo,
  };
  return {
    recordNotes: '',
    contentFingerprints,
    stakeholders,
    contentMetadata: Buffer.from(JSON.stringify(contentMetadata), 'utf8'),
  };
}

export async function estimateISCNTxFee(tx, {
  version = 1,
} = {}) {
  const record = formatISCNPayload(tx);
  const feePerByte = await queryFeePerByte();
  const feePerByteAmount = feePerByte ? parseInt(feePerByte.amount, 10) : 1;
  const {
    recordNotes,
    contentFingerprints,
    stakeholders,
    contentMetadata,
  } = record;
  const now = new Date();
  const obj = {
    '@context': {
      '@vocab': 'http://iscn.io/',
      recordParentIPLD: {
        '@container': '@index',
      },
      stakeholders: {
        '@context': {
          '@vocab': 'http://schema.org/',
          entity: 'http://iscn.io/entity',
          rewardProportion: 'http://iscn.io/rewardProportion',
          contributionType: 'http://iscn.io/contributionType',
          footprint: 'http://iscn.io/footprint',
        },
      },
      contentMetadata: {
        '@context': null,
      },
    },
    '@type': 'Record',
    '@id': `iscn://${ISCN_REGISTRY_NAME}/btC7CJvMm4WLj9Tau9LAPTfGK7sfymTJW7ORcFdruCU/1`,
    recordTimestamp: now.toISOString(),
    recordVersion: version,
    recordNotes,
    contentFingerprints,
    recordParentIPLD: {},
  };
  if (version > 1) {
    obj.recordParentIPLD = {
      '/': 'bahuaierav3bfvm4ytx7gvn4yqeu4piiocuvtvdpyyb5f6moxniwemae4tjyq',
    };
  }

  const byteSize = Buffer.from(jsonStringify(obj), 'utf-8').length
    + stakeholders.reduce((acc, s) => acc + s.length, 0)
    + contentMetadata.length;
  const iscnFee = byteSize * feePerByteAmount;

  return { iscnFee };
}

export async function estimateISCNTxGas(tx) {
  const record = await formatISCNPayload(tx);
  const msg = {
    type: Buffer.from('likecoin-chain/MsgCreateIscnRecord', 'utf-8'),
    value: {
      from: Buffer.from(tx.cosmosWallet, 'utf-8'),
      record,
    },
  };
  const value = {
    msg: [msg],
    fee: {
      amount: [
        {
          denom: 'nanolike',
          amount: '200000', // temp number here for estimation
        },
      ],
      gas: '200000', // temp number here for estimation
    },
  };
  const obj = {
    type: 'cosmos-sdk/StdTx',
    value: Buffer.from(jsonStringify(value), 'utf-8'),
  };
  const interceptWithBuffer = BigNumber(GAS_ESTIMATOR_INTERCEPT).plus(GAS_ESTIMATOR_BUFFER);
  const txBytes = Buffer.from(jsonStringify(obj), 'utf-8');
  const byteSize = BigNumber(txBytes.length);
  const gasUsedEstimation = byteSize.multipliedBy(GAS_ESTIMATOR_SLOP).plus(interceptWithBuffer);
  return {
    gasFee: {
      amount: [{
        amount: gasUsedEstimation.multipliedBy(DEFAULT_GAS_PRICE_NUMBER).toFixed(0, 0),
        denom: COSMOS_DENOM,
      }],
      gas: gasUsedEstimation.toFixed(0, 0),
    },
  };
}

export async function calculateISCNTotalFee(tx, version = 1) {
  const { gasFee } = await estimateISCNTxGas(tx);
  const { iscnFee } = await estimateISCNTxFee(tx, { version });
  const totalFee = new BigNumber(iscnFee).plus(gasFee.amount[0].amount).shiftedBy(-9);
  const ISCNTotalFee = totalFee.toFixed(2);
  return { ISCNTotalFee };
}

export async function signISCNTx(tx, signer, address, memo) {
  const record = formatISCNPayload(tx);
  const client = await SigningStargateClient.connectWithSigner(
    ISCN_RPC_URL,
    signer,
    { registry },
  );

  const message = {
    typeUrl: '/likechain.iscn.MsgCreateIscnRecord',
    value: {
      from: address,
      record,
    },
  };
  const { gasFee } = await estimateISCNTxGas(tx);
  const response = await client.signAndBroadcast(address, [message], gasFee, memo);
  assertIsBroadcastTxSuccess(response);
  return response;
}
