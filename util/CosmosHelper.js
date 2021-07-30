import BigNumber from 'bignumber.js';
import {
  COSMOS_DENOM,
  BASIC_TRANSFER_GAS,
  // EXTERNAL_URL,
} from '@/constant';
import { timeout } from '@/util/misc';
import { queryTxInclusion } from '@/util/cosmos/misc';
import {
  SigningStargateClient,
  StargateClient,
} from '@cosmjs/stargate';
import { MsgSend, MsgMultiSend } from '@cosmjs/stargate/build/codec/cosmos/bank/v1beta1/tx';
import { decodeTxRaw } from '@cosmjs/proto-signing';

export const DEFAULT_GAS_PRICE = [{ amount: '1000', denom: COSMOS_DENOM }];
export const DEFAULT_GAS_PRICE_NUMBER = parseInt(DEFAULT_GAS_PRICE[0].amount, 10);
export const DEFAULT_ISCN_GAS_PRICE = [{ amount: 0, denom: COSMOS_DENOM }];
// const COSMOS_RESTFUL_API = `${EXTERNAL_URL}/api/cosmos/lcd`; // https://node.taipei2.like.co/api/cosmos/lcd
const COSMOS_RPC_API = 'https://node.iscn-dev-2.like.co/rpc/'; // note: need to have '/' in the end
const COSMOS_RESTFUL_API = 'https://node.iscn-dev-2.like.co/';
let stargateClient;
let signingStargateClient;

async function initStargateClient() {
  if (stargateClient) return;
  stargateClient = await StargateClient.connect(COSMOS_RPC_API);
}

async function initSigningStargateClient(url, senderWallet) {
  if (signingStargateClient) return;
  signingStargateClient = await SigningStargateClient.connectWithSigner(url, senderWallet);
}

function LIKEToNanolike(value) {
  return (new BigNumber(value)).multipliedBy(1e9).toFixed();
}

export function LIKEToAmount(value) {
  return { denom: COSMOS_DENOM, amount: LIKEToNanolike(value) };
}

export function amountToLIKE(likecoin) {
  if (likecoin.denom === COSMOS_DENOM) {
    return (new BigNumber(likecoin.amount)).dividedBy(1e9).toFixed();
  }
  console.error(`${likecoin.denom} is not supported denom`);
  return -1;
}

export async function getTransactionCompleted(txHash) {
  if (!stargateClient) await initStargateClient();
  const txData = await stargateClient.getTx(txHash);
  if (!txData || !txData.height) {
    return 0;
  }
  const {
    timestamp,
    code,
    rawLog,
  } = txData;
  const fullLogs = JSON.parse(rawLog);
  return {
    ts: (new Date(timestamp)).getTime(),
    isFailed: (code && code !== '0') || !fullLogs[0].success,
  };
}

export async function getTransferInfo(txHash, opt) {
  if (!stargateClient) await initStargateClient();
  const { blocking } = opt;
  // TODO: handle tranferMultiple?
  let txData = await stargateClient.getTx(txHash);
  console.log('!txData: ', txData);
  if ((!txData || !txData.height) && !blocking) {
    return {};
  }
  while ((!txData || !txData.height) && blocking) {
    await timeout(1000); // eslint-disable-line no-await-in-loop
    txData = await stargateClient.getTx(txHash); // eslint-disable-line no-await-in-loop
  }
  if (!txData) throw new Error('Cannot find transaction');
  const decodedTx = decodeTxRaw(txData.tx);
  const decoder = new TextDecoder();
  const decodedMsg = decoder.decode(decodedTx.body.messages[0].value);
  // eslint-disable-next-line no-control-regex
  const cleanComponents = decodedMsg.replace(/[\x00-\x08\x0E-\x1F\x7F-\uFFFF-\n]/g, '');
  const separateCleanComponent = cleanComponents.split(' ');
  const clusterComponents = separateCleanComponent[0].split('nanolike');
  const fromAndTo = clusterComponents[0].split('cosmos1');
  const nanolikeAmount = clusterComponents[1];
  const fromAddress = fromAndTo[1];
  const toAddress = fromAndTo[2];
  const completeFromAddress = `cosmos1${fromAddress}`;
  const completeToAddress = `cosmos1${toAddress}`;
  const msgContent = {
    value: {
      amount: [{ amount: nanolikeAmount, denom: 'nanolike' }],
      from_address: completeFromAddress,
      to_address: completeToAddress,
    },
  };
  const msg = [];
  msg.push(msgContent);

  const {
    rawLog,
    timestamp,
    code,
  } = txData;
  let amount = [];
  let from = [];
  let to = [];
  if (msg.length > 1) {
    msg.forEach((m) => {
      const {
        value: {
          amount: [a],
          from_address: f,
          to_address: t,
        },
      } = m;
      amount.push(a);
      from.push(f);
      to.push(t);
    });
  } else {
    ([{
      value: {
        amount: [amount],
        from_address: from,
        to_address: to,
      },
    }] = msg);
  }
  if (Array.isArray(from)) [from] = from; // TODO: support multiple from addr?
  if (!txData.height) {
    return {
      _from: from,
      _to: to,
      _amount: amount,
    };
  }
  const fullLogs = JSON.parse(rawLog.slice(1, rawLog.length - 1));
  const isFailed = (code && code !== '0') || !fullLogs.success;
  return {
    isFailed,
    _from: from,
    _to: to,
    _amount: amount,
    timestamp: (new Date(timestamp)).getTime() / 1000,
  };
}

export async function queryLikeCoinBalance(addr) {
  if (!stargateClient) await initStargateClient();
  const amount = await stargateClient.getBalance(addr, COSMOS_DENOM); // also see: getAccount(addr)
  if (!amount) return 0;
  return amountToLIKE(amount);
}

export async function calculateGas(to) {
  const fee = {
    amount: DEFAULT_GAS_PRICE,
    gas: (to.length * parseInt(BASIC_TRANSFER_GAS, 10)).toString(),
  };
  const { gas } = fee;
  const gasPrices = fee.amount;
  return { gas, gasPrices };
}

export async function transfer({
  from,
  to,
  value,
  memo,
}, signer) {
  const amount = LIKEToAmount(value);
  const { gas, gasPrices } = await calculateGas([to]);
  const fee = {
    amount: DEFAULT_GAS_PRICE,
    gas,
  };
  if (!signingStargateClient) {
    await initSigningStargateClient(COSMOS_RPC_API, signer);
  }
  const sendMsg = MsgSend.fromPartial({
    fromAddress: from,
    toAddress: to,
    amount: [amount],
  });

  const msgs = {
    typeUrl: '/cosmos.bank.v1beta1.MsgSend',
    value: sendMsg,
  };
  const broadcastedTx = await signingStargateClient.signAndBroadcast(from, [msgs], fee, memo);
  return {
    txHash: broadcastedTx.transactionHash,
    gas,
    gasPrices,
    included: () => queryTxInclusion(broadcastedTx.transactionHash, COSMOS_RESTFUL_API),
  };
}

export async function transferMultiple({
  from,
  tos,
  values,
  memo,
}, signer) {
  const amounts = values.map(v => LIKEToAmount(v));
  const totalValue = amounts.reduce((acc, amount) => acc.plus(amount.amount), new BigNumber(0));
  const outputs = [];
  tos.forEach((target, index) => {
    outputs.push({
      address: target,
      coins: [amounts[index]],
    });
  });
  const { gas, gasPrices } = await calculateGas(tos);
  const fee = {
    amount: DEFAULT_GAS_PRICE,
    gas,
  };
  if (!signingStargateClient) {
    await initSigningStargateClient(COSMOS_RPC_API, // eslint-disable-line no-await-in-loop);
      signer);
  }
  const sendMsg = MsgMultiSend.fromPartial({
    inputs: [
      {
        address: from,
        coins: [
          {
            denom: COSMOS_DENOM,
            amount: totalValue.toFixed().toString(),
          },
        ],
      },
    ],
    outputs,
  });

  const msgs = {
    typeUrl: '/cosmos.bank.v1beta1.MsgMultiSend',
    value: sendMsg,
  };

  const broadcastedTx = await signingStargateClient.signAndBroadcast(from, [msgs], fee, memo);
  return {
    txHash: broadcastedTx.transactionHash,
    gas,
    gasPrices,
    included: () => queryTxInclusion(broadcastedTx.transactionHash, COSMOS_RESTFUL_API),
  };
}
