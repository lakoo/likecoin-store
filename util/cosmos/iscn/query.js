import { StargateClient } from '@cosmjs/stargate';
import { parseISCNTxInfoFromIndexedTx } from '@likecoin/iscn-js';

import { timeout } from '@/util/misc';
import { EXTERNAL_URL } from '@/constant';

const ISCN_RPC_URL = `${EXTERNAL_URL}/api/cosmos/rpc`;

let stargateClient;

export async function getApiClient() {
  if (!stargateClient) stargateClient = await StargateClient.connect(ISCN_RPC_URL);
  return stargateClient;
}

export async function getISCNTransferInfo(txHash, opt) {
  const apiClient = await getApiClient();
  const { blocking } = opt;
  let txData = await apiClient.getTx(txHash);
  if ((!txData || !txData.height) && !blocking) {
    return {};
  }
  while ((!txData || !txData.height) && blocking) {
    await timeout(1000); // eslint-disable-line no-await-in-loop
    txData = await apiClient.getTx(txHash); // eslint-disable-line no-await-in-loop
  }
  if (!txData) throw new Error('Cannot find transaction');
  const parsed = parseISCNTxInfoFromIndexedTx(txData);
  const {
    height,
    code,
  } = txData;
  if (!height) {
    return {};
  }

  const block = await apiClient.getBlock(height);
  const { header: { time: timestamp } } = block;
  let isISCNTx = true;
  const messages = [];
  if (parsed.tx.body.messages.length === 0) {
    isISCNTx = false;
    return { isISCNTx };
  }
  // Not LIKE transfer, continue parse ISCN transaction payload
  parsed.tx.body.messages.forEach((m, index) => {
    const data = m.value.record;
    if (!data) return;
    const log = parsed.logs[index];
    const event = log.events.find(e => e.type === 'iscn_record');
    if (!event) return;
    const { attributes } = event;
    const ipldAttr = attributes.find(a => a.key === 'ipld');
    const ipld = ipldAttr && ipldAttr.value;
    const iscnIdAttr = attributes.find(a => a.key === 'iscn_id');
    const iscnId = iscnIdAttr && iscnIdAttr.value;
    const ownerAttr = attributes.find(a => a.key === 'owner');
    const owner = ownerAttr && ownerAttr.value;
    if (!ipld || !iscnId) return;
    messages.push({
      ipld,
      id: iscnId,
      data,
      owner,
    });
  });
  const [message] = messages;
  const {
    ipld,
    id: iscnId,
    owner,
    data: {
      stakeholders,
      contentMetadata: {
        '@type': type,
        name,
        url,
        keywords,
        usageInfo,
      },
      recordNotes,
      contentFingerprints,
    },
  } = message;
  let parsedFingerprint = contentFingerprints.find(f => f.includes('ipfs://'));
  if (parsedFingerprint) [, parsedFingerprint] = parsedFingerprint.split('ipfs://');
  const isFailed = (code && code !== '0');
  const tags = (keywords || '').split(',');
  return {
    ipld,
    iscnId,
    from: owner,
    fingerprint: parsedFingerprint,
    tags,
    url,
    name,
    type,
    isFailed,
    rights: [usageInfo],
    stakeholders,
    contentTimestamp: (new Date(timestamp)).getTime(),
    timestamp: (new Date(timestamp)).getTime() / 1000,
    recordNotes,
    isISCNTx,
  };
}

export async function getISCNTransactionCompleted(txHash) {
  const apiClient = await getApiClient();
  const txData = await apiClient.getTx(txHash);
  if (!txData || !txData.height) {
    return 0;
  }
  const {
    timestamp,
    code,
    logs: [{ success = false } = {}] = [],
  } = txData;
  return {
    ts: (new Date(timestamp)).getTime(),
    isFailed: (code && code !== '0') || !success,
  };
}
