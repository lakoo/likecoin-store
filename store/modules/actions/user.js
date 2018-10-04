import BigNumber from 'bignumber.js';

import * as api from '@/util/api/api';
import * as types from '@/store/mutation-types';
import {
  REDIRECT_NAME_WHITE_LIST,
  ONE_LIKE,
} from '@/constant';

import EthHelper from '@/util/EthHelper';
import User from '@/util/User';

import apiWrapper from './api-wrapper';

export async function newUser(ctx, data) {
  return apiWrapper(ctx, api.apiPostNewUser(data), { blocking: true });
}

export async function updateUser(ctx, data) {
  return apiWrapper(ctx, api.apiPostUpdateUser(data), { blocking: true });
}

export async function loginUser(ctx, data) {
  return apiWrapper(ctx, api.apiLoginUser(data), { blocking: true });
}

export async function loginUserBySign(ctx, data) {
  try {
    await api.apiCheckIsUser(state.wallet);
  } catch (err) {
    return true; // not user, let it pass
  }

  try {
    commit(types.USER_AWAITING_AUTH, true);
    await api.apiCheckUserAuth(state.wallet);
    dispatch('refreshUser', state.wallet);
    commit(types.USER_AWAITING_AUTH, false);
    return true;
  } catch (err) {
    // not authed, continue
  }
  let payload;
  try {
    payload = await User.signLogin(state.wallet);
  } catch (e) {
    // rejected signing, return false;
    return false;
  }
  if (!payload) return false;

  await api.apiLoginUser(payload);
  await dispatch('refreshUser', state.wallet);
  commit(types.USER_AWAITING_AUTH, false);
  return true;
}

export async function onWalletChanged({ state, commit, dispatch }, wallet) {
  try {
    if (state.wallet !== wallet) {
      commit(types.USER_SET_USER_INFO, {});
    }
    commit(types.USER_SET_LOCAL_WALLET, wallet);
    commit(types.UI_INFO_MSG, '');
    commit(types.MISSION_CLEAR_ALL);
    if (!state.wallet) return;
    await api.apiCheckIsUser(state.wallet);
    commit(types.USER_AWAITING_AUTH, true);
  } catch (err) {
    return;
  }
  try {
    await api.apiCheckUserAuth(state.wallet);
    await dispatch('refreshUser', state.wallet);
    commit(types.USER_AWAITING_AUTH, false);
  } catch (err) {
    // no op
  }
}

export function setWeb3IsFetching({ commit }, fetching) {
  commit(types.USER_SET_WEB3_FETCHING, fetching);
}

export function setUserNeedAuth({ commit }, needAuth) {
  commit(types.USER_AWAITING_AUTH, needAuth);
}

export async function refreshUser({ commit, state, dispatch }, addr) {
  try {
    commit(types.USER_SET_FETCHING, true);
    const { data: user } = await api.apiGetUserByAddr(addr);
    const oldUser = state.user.user;
    const currentUser = (user || {}).user;
    if (user && user.user) {
      await dispatch('fetchSocialListDetailsById', user.user);
      commit(types.USER_SET_USER_INFO, user);
    } else {
      commit(types.USER_SET_USER_INFO, {});
    }
    if (currentUser !== oldUser) {
      commit(types.UI_INFO_MSG, '');
      commit(types.MISSION_CLEAR_ALL);
    }
    commit(types.USER_SET_FETCHING, false);
  } catch (error) {
    console.error(error);
    commit(types.USER_SET_USER_INFO, {});
    commit(types.USER_SET_FETCHING, false);
    // do nothing
  }
}

export async function refreshUserInfo({ commit, dispatch }, id) {
  try {
    commit(types.USER_SET_FETCHING, true);
    const user = await apiWrapper({ commit, dispatch }, api.apiGetUserById(id), { slient: true });
    if (user) {
      user.user = id;
      commit(types.USER_SET_USER_INFO, user);
    }
    commit(types.USER_SET_FETCHING, false);
  } catch (error) {
    commit(types.USER_SET_FETCHING, false);
    throw error;
  }
}
export async function getWalletByUser(ctx, id) {
  const { wallet } = await apiWrapper(ctx, api.apiGetUserById(id), { blocking: true });
  return wallet;
}

export async function sendVerifyEmail({ commit, dispatch, rootState }, { id, ref }) {
  let redirect = '';
  if (REDIRECT_NAME_WHITE_LIST.indexOf(ref) > -1) redirect = ref;
  return apiWrapper(
    { commit, dispatch },
    api.apiSendVerifyEmail(id, redirect, rootState.ui.locale),
    { blocking: true },
  );
}

export async function verifyEmailByUUID({ commit, dispatch, rootState }, uuid) {
  return apiWrapper(
    { commit, dispatch },
    api.apiVerifyEmailByUUID(uuid, rootState.ui.locale),
    { blocking: true },
  );
}

export async function fetchUserReferralStats({ commit, dispatch }, id) {
  return apiWrapper({ commit, dispatch }, api.apiGetReferralById(id));
}

export async function getMiniUserById({ commit, dispatch }, id) {
  return apiWrapper({ commit, dispatch }, api.apiGetUserMinById(id), { slient: true });
}

export async function fetchUserTotalBonus({ commit, dispatch }, id) {
  const { bonus } = await apiWrapper({ commit, dispatch }, api.apiGetTotalBonusById(id));
  return bonus;
}

export async function fetchtSocialListById({ commit, dispatch }, id) {
  const platforms = await apiWrapper({ commit, dispatch }, api.apiGetSocialListById(id));
  commit(types.USER_SET_SOCIAL, platforms);
  return true;
}

export async function fetchSocialListDetailsById({ commit, dispatch }, id) {
  const payload = await apiWrapper({ commit, dispatch }, api.apiGetSocialListDetialsById(id));
  commit(types.USER_SET_SOCIAL_DETAILS, payload);
}

export async function fetchSocialPlatformLink({ commit, dispatch }, { platform, id }) {
  return apiWrapper({ commit, dispatch }, api.apiGetSocialPlatformLink(platform, id));
}

export async function linkSocialPlatform({ commit, dispatch }, { platform, payload }) {
  const {
    displayName, url, pages, id,
  } = await apiWrapper(
    { commit, dispatch },
    api.apiLinkSocialPlatform(platform, payload),
  );
  commit(types.USER_LINK_SOCIAL, {
    platform, displayName, url, pages, id,
  });
  return true;
}

export async function unlinkSocialPlatform({ commit, dispatch }, { platform, payload }) {
  await apiWrapper(
    { commit, dispatch },
    api.apiUnlinkSocialPlatform(platform, payload),
  );
  commit(types.USER_UNLINK_SOCIAL, platform);
}

export async function selectFacebookPageLink({ commit, dispatch }, { pageId, payload }) {
  const { url } = await apiWrapper(
    { commit, dispatch },
    api.apiSelectFacebookPageLink(pageId, payload),
  );
  commit(types.USER_SELECT_FACEBOOK_PAGE_LINK, url);
}

export async function updateSocialPlatformIsPublic({ commit, dispatch }, payload) {
  await apiWrapper(
    { commit, dispatch },
    api.apiPostSocialPlatformsIsPublic(payload),
  );
  commit(types.USER_SET_SOCIAL_PLATFORMS_IS_PUBLIC, payload);
}

export async function addUserSocialLink({ commit, dispatch }, payload) {
  const link = await apiWrapper(
    { commit, dispatch },
    api.apiPostAddUserSocialLink(payload),
  );
  commit(types.USER_ADD_SOCIAL_LINK, link);
}

export async function updateUserSocialLink({ commit, dispatch }, { linkId, payload }) {
  await apiWrapper(
    { commit, dispatch },
    api.apiPostUpdateUserSocialLink(linkId, payload),
  );
  commit(types.USER_SET_SOCIAL_LINK, payload.link);
}

export async function sendCouponCodeEmail({ commit, dispatch, rootState }, data) {
  return apiWrapper(
    { commit, dispatch },
    api.apiSendCouponCodeEmail(data.user, data.coupon, rootState.ui.locale),
    { blocking: true },
  );
}

export async function sendInvitationEmail({ commit, dispatch, rootState }, data) {
  return apiWrapper(
    { commit, dispatch },
    api.apiSendInvitationEmail(data.user, data.email, rootState.ui.locale),
    { blocking: true },
  );
}

export async function sendKYC(ctx, { payload, isAdv }) {
  return apiWrapper(
    ctx,
    isAdv ? api.apiPostAdvancedKYC(payload) : api.apiPostKYC(payload),
    { blocking: true },
  );
}

export async function fetchAdvancedKYC({ commit, dispatch }, id) {
  return apiWrapper({ commit, dispatch }, api.apiGetAdvancedKYC(id));
}

export async function queryLikeCoinWalletBalance({ commit, state }) {
  try {
    const balance = await EthHelper.queryLikeCoinBalance(state.wallet);
    commit(types.USER_SET_LIKECOIN_BIG_NUMBER_AMOUNT, new BigNumber(balance).dividedBy(ONE_LIKE));
  } catch (err) {
    console.error(err);
  }
}

export async function updateUserReadContentStatus({ commit, dispatch }, { id, payload }) {
  try {
    await apiWrapper({ commit, dispatch }, api.apiPostUserReadContent(id, payload));
    commit(types.USER_UPDATE_READ_CONTENT_STATUS, payload);
  } catch (err) {
    console.error(err);
  }
}
