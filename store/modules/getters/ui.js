export const getInfoMsg = state => state.infoMsg;

export const getInfoIsError = state => state.infoIsError;

export const getIsLoginOverride = state => state.isLoginOverride;

export const getIsErrorDisabled = state => state.isErrorDisabled;

export const getPopupError = state => state.popupError;

export const getPopupInfo = state => state.popupInfo;

export const getPopupDialogs = state => state.popupDialogs;

export const getIsInTransaction = state => state.isInTransaction;

export const getIsLoading = state => state.isLoading;

export const getIsPopupBlocking = state => state.isBlocking;

export const getIsShowingTxPopup = state => state.isShowingTxPopup;

export const getHeaderIcon = state => state.headerIcon;

export const getHeaderTitle = state => state.headerTitle;

export const getDesc = state => state.description;

export const getHeaderSubtitle = state => state.headerSubtitle;

export const getMetamaskError = state => state.metamaskError;

export const getSignPayloadObject = state => state.signPayloadObject;

export const getWeb3Type = state => state.web3Type;

export const getTxDialogType = state => state.txDialogType;

export const getIsSignFinishedState = state => state.isSignFinished;

export const getIsTxFailed = state => state.isTxFailed;

export const getTxDialogHideAction = state => state.txDialogHideAction;

export const getTxDialogActionRoute = state => state.txDialogActionRoute;

export const getTxDialogActionText = state => state.txDialogActionText;

export const getCurrentLocale = state => state.locale;

export const getCurrentLocaleISO = (state) => {
  const { locale } = state;
  switch (locale) {
    case 'zh':
      return 'zh-Hant';
    case 'cn':
      return 'zh-Hans';
    default:
      return locale;
  }
};

export const getCurrentOgLocale = (state) => {
  const { locale } = state;
  switch (locale) {
    case 'en':
      return 'en_US';
    case 'zh':
      return 'zh_HK';
    case 'cn':
      return 'zh_CN';
    case 'ja':
      return 'ja_JP';
    default:
      return locale;
  }
};

export const getIsSlidingMenuOpen = state => state.isSlidingMenuOpen;

/* eslint-disable-next-line max-len */
export const getIsShowingPromptNotificationDialog = state => state.isShowingPromptNotificationDialog;

export const getAuthDialogStatus = state => state.authDialogStatus;
export const getIsShowAuthDialog = state => state.authDialogStatus.isShow;
export const getIsShowReAuthDialog = state => state.reAuthDialogStatus.isShow;

export const getIsShowWalletNoticeDialog = state => state.isShowWalletNoticeDialog;
export const getWalletNoticeDialogCancelTitle = state => state.walletNoticeDialogCancelTitle;
export const getWalletNoticeDialogCancelCallback = state => state.walletNoticeDialogCancelCallback;
export const getWalletNoticeDialogConfirmCallback = state => (
  state.walletNoticeDialogConfirmCallback
);
