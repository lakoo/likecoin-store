// eslint-disable-next-line import/no-extraneous-dependencies
import BigNumber from 'bignumber.js';
import { ISCNSigningClient } from '@likecoin/iscn-js';

import { ISCN_RPC_URL, ISCN_PUBLISHERS, ISCN_LICENSES } from './constant';
import { EXTERNAL_URL } from '../../../constant';

let isConnected;
let iscnClient;

function getISCNEstimationClient() {
  if (!iscnClient) {
    iscnClient = new ISCNSigningClient(ISCN_RPC_URL);
  }
  return iscnClient;
}

async function getISCNSigningClient(signer) {
  if (!isConnected) {
    const client = getISCNEstimationClient();
    await client.connectWithSigner(ISCN_RPC_URL, signer);
    isConnected = true;
  }
  return iscnClient;
}

function getPublisherISCNPayload(user, { publisher, license }) {
  const {
    userId,
    displayName,
    cosmosWallet,
    authorDescription,
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
      stakeholders.push({
        entity: {
          '@id': id,
          name,
          description,
        },
        rewardProportion: 0,
        contributionType: 'http://schema.org/publisher',
      });
      usageInfo = `ipfs://${ISCN_LICENSES[mattersLicense]['/']}`;
      break;
    }
    default:
  }
  if (userId && displayName) {
    stakeholders.unshift({
      entity: {
        '@id': `${EXTERNAL_URL}/${userId}`,
        name: displayName,
      },
      rewardProportion: 1,
      contributionType: 'http://schema.org/author',
    });
  } else if (cosmosWallet) { // from Keplr
    stakeholders.unshift({
      entity: {
        '@id': `did:cosmos:${cosmosWallet.split('cosmos')[1]}`,
        name: displayName, // if from WordPress, this would be WP user display name
        description: authorDescription, // if from WordPress, this would be WP Biographical Info
      },
      rewardProportion: 1,
      contributionType: 'http://schema.org/author',
    });
  }
  return {
    usageInfo,
    stakeholders,
  };
}

function preformatISCNPayload(payload) {
  const {
    userId,
    displayName,
    cosmosWallet,
    fingerprints,
    name,
    tags,
    type,
    license,
    publisher,
    authorDescription,
    description,
    url,
  } = payload;

  let actualType = 'CreativeWork';

  const { usageInfo, stakeholders } = getPublisherISCNPayload({
    userId,
    displayName,
    cosmosWallet,
    authorDescription,
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

  let contentFingerprints = [];
  if (fingerprints) {
    contentFingerprints = contentFingerprints.concat(fingerprints);
  }

  const preformatedPayload = {
    name,
    description,
    url,
    keywords: tags,
    type: actualType,
    usageInfo,
    recordNotes: '',
    contentFingerprints,
    stakeholders,
  };
  return preformatedPayload;
}

export async function calculateISCNTotalFee(tx) {
  const payload = preformatISCNPayload(tx);
  const client = await getISCNEstimationClient();
  const { gas, iscnFee } = await client.esimateISCNTxGasAndFee(payload);
  const ISCNFeeAmount = iscnFee.amount;
  const gasFeeAmount = gas.fee.amount[0].amount;
  const ISCNTotalFee = new BigNumber(ISCNFeeAmount).plus(gasFeeAmount).shiftedBy(-9).toFixed(2);
  return { ISCNTotalFee };
}

export async function signISCNTx(tx, signer, address, { memo, broadcast = true } = {}) {
  const payload = preformatISCNPayload(tx);
  const client = await getISCNSigningClient(signer);
  const res = await client.createISCNRecord(address, payload, { memo, broadcast });
  return res;
}
