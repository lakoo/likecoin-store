// eslint-disable-next-line import/no-extraneous-dependencies
import BigNumber from 'bignumber.js';
import { ISCNSigningClient } from '@likecoin/iscn-js';
import bech32 from 'bech32';
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

function changeAddressPrefix(address, newPrefix) {
  const { words } = bech32.decode(`${address}`);
  return bech32.encode(newPrefix, words);
}

function isValidLikeAddress(address) {
  return /^like1[ac-hj-np-z02-9]{38}$/.test(address);
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
    author,
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
    default: {
      if (publisher) {
        stakeholders.push({
          entity: {
            '@id': publisher,
            publisher,
          },
          rewardProportion: 0,
          contributionType: 'http://schema.org/publisher',
        });
      }
      usageInfo = license;
    }
  }
  if (author && cosmosWallet) { // from Keplr
    let likePrefixAddress = cosmosWallet;
    if (!isValidLikeAddress(cosmosWallet)) {
      likePrefixAddress = changeAddressPrefix(cosmosWallet, 'like');
    }

    stakeholders.unshift({
      entity: {
        '@id': `did:like:${likePrefixAddress.split('like')[1]}`,
        name: author,
        description: authorDescription,
      },
      rewardProportion: 1,
      contributionType: 'http://schema.org/author',
    });
  } else if (userId && displayName) {
    stakeholders.unshift({
      entity: {
        '@id': `${EXTERNAL_URL}/${userId}`,
        name: displayName,
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
    author,
    authorDescription,
    description,
    url,
    recordNotes = '',
  } = payload;

  let actualType = 'CreativeWork';

  const { usageInfo, stakeholders } = getPublisherISCNPayload({
    userId,
    displayName,
    cosmosWallet,
    author,
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
    recordNotes,
    contentFingerprints,
    stakeholders,
  };
  return preformatedPayload;
}

export async function calculateISCNTotalFee(tx, { memo } = {}) {
  const payload = preformatISCNPayload(tx);
  const client = await getISCNEstimationClient();
  const { gas, iscnFee } = await client.esimateISCNTxGasAndFee(payload, { memo });
  const ISCNFeeAmount = iscnFee.amount;
  const gasFeeAmount = gas.fee.amount[0].amount;
  const ISCNTotalFee = new BigNumber(ISCNFeeAmount).plus(gasFeeAmount).shiftedBy(-9).toFixed(2);
  return { ISCNTotalFee };
}

export async function signISCNTx(tx, signer, address, { iscnId, memo, broadcast = true } = {}) {
  const payload = preformatISCNPayload(tx);
  const client = await getISCNSigningClient(signer);
  let res;
  if (iscnId) {
    res = await client.updateISCNRecord(address, iscnId, payload, { memo, broadcast });
  } else {
    res = await client.createISCNRecord(address, payload, { memo, broadcast });
  }
  return res;
}
