export const getUserInfo = state => state.user;

export const getUserIsFetching = state => state.isFetching;

export const getWeb3IsFetching = state => state.web3Fetching;

export const getUserNeedAuth = state => !state.web3Fetching && state.isAwaitingAuth;

export const getUserIsReady = (state) => {
  const { web3Fetching, isFetching, isAwaitingAuth } = state;
  return !web3Fetching && !isFetching && !isAwaitingAuth;
};

export const getUserIsRegistered = state => !!state.user.wallet;

export const getLocalWallet = state => state.wallet;
