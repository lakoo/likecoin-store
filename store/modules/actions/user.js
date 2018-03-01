/* eslint import/prefer-default-export: "off" */
import * as api from '@/util/api/api';
import * as types from '@/store/mutation-types';
import apiWrapper from './api-wrapper';

export async function newUser({ commit }, data) {
  return apiWrapper(commit, api.apiPostNewUser(data), { blocking: true });
}

export function setLocalWallet({ commit }, wallet) {
  commit(types.USER_SET_LOCAL_WALLET, wallet);
}

export async function isUser({ commit }, addr) {
  try {
    const { data: user } = await api.apiCheckIsUser(addr);
    if (user && user.user) {
      commit(types.USER_SET_USER_INFO, user);
    } else {
      commit(types.USER_SET_USER_INFO, {});
    }
  } catch (error) {
    commit(types.USER_SET_USER_INFO, {});
    // do nothing
  }
}

export async function getWalletByUser({ commit }, id) {
  const { wallet } = await apiWrapper(commit, api.apiGetUserById(id), { blocking: true });
  return wallet;
}

export async function sendVerifyEmail({ commit, rootState }, id) {
  return apiWrapper(commit, api.apiSendVerifyEmail(id, rootState.ui.locale), { blocking: true });
}

export async function verifyEmailByUUID({ commit, rootState }, uuid) {
  const { wallet } = await apiWrapper(
    commit,
    api.apiVerifyEmailByUUID(uuid, rootState.ui.locale),
    { blocking: true },
  );
  return wallet;
}

export async function refreshUserInfo({ commit }, id) {
  try {
    const { data: user } = await api.apiGetUserById(id);
    if (user) {
      user.user = id;
      commit(types.USER_SET_USER_INFO, user);
    }
  } catch (error) {
    throw error;
  }
}

export async function fetchUserReferralStats({ commit }, id) {
  return apiWrapper(commit, api.apiGetReferralById(id));
}

export async function sendCouponCodeEmail({ commit, rootState }, data) {
  return apiWrapper(
    commit,
    api.apiSendCouponCodeEmail(data.user, data.coupon, rootState.ui.locale),
    { blocking: true },
  );
}

export async function sendInvitationEmail({ commit }, data) {
  return apiWrapper(
    commit,
    api.apiSendInvitationEmail(data.user, data.email),
    { blocking: true },
  );
}
