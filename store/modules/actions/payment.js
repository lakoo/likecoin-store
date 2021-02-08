/* eslint import/prefer-default-export: "off" */

import * as api from '@/util/api/api';
import * as types from '@/store/mutation-types';
import {
  transfer as transferCosmos,
  transferMultiple as transferCosmosMultiple,
} from '@/util/CosmosHelper';
import apiWrapper from './api-wrapper';

export async function sendCosmosPayment(
  { commit },
  {
    signer,
    isWait = true,
    showDialogAction = true,
    ...payload
  },
) {
  try {
    const {
      from,
      to,
      tos,
      value,
      values,
      memo,
      metadata,
    } = payload;
    let txHash;
    let included;
    if (tos && values) {
      ({ txHash, included } = await transferCosmosMultiple({
        from,
        tos,
        values,
        memo,
      }, signer));
    } else {
      ({ txHash, included } = await transferCosmos({
        from,
        to,
        value,
        memo,
      }, signer));
    }
    if (metadata) await api.apiPostTxMetadata(txHash, metadata);
    commit(types.UI_START_LOADING_TX, { isWait });
    commit(types.UI_SET_HIDE_TX_DIALOG_ACTION, !showDialogAction);
    commit(types.PAYMENT_SET_PENDING_HASH, txHash);
    commit(types.PAYMENT_SET_PENDING_TX_INFO, { from, to, value });
    if (isWait) await included();
    commit(types.UI_STOP_LOADING_TX);
    return txHash;
  } catch (error) {
    commit(types.UI_STOP_ALL_LOADING);
    commit(types.UI_ERROR_MSG, error.message || error);
    throw error;
  }
}

export const closeTxToolbar = ({ commit }) => {
  commit(types.PAYMENT_SET_PENDING_HASH, '');
};

export async function queryTxHistoryByAddr({ commit, dispatch }, { addr, ts, count }) {
  return apiWrapper({ commit, dispatch }, api.apiQueryTxHistoryByAddr(addr, ts, count));
}

export async function queryTxHistoryByUserId({ commit, dispatch }, { id, ts, count }) {
  return apiWrapper({ commit, dispatch }, api.apiQueryTxHistoryByUserId(id, ts, count));
}
