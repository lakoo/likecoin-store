import {
  GETTING_STARTED_TASKS,
} from '../constant';

const ValidationHelper = {
  checkAddressValid(addr) {
    return addr.length === 42 && addr.substr(0, 2) === '0x';
  },
  filterUserData({
    user,
    displayName,
    email,
    avatar,
    wallet,
    referrer,
    KYC,
    pendingKYC,
    isEmailVerified,
  }) {
    return {
      user,
      displayName,
      email,
      avatar,
      wallet,
      referrer: !!referrer,
      KYC,
      pendingKYC,
      isEmailVerified,
    };
  },
  filterTxData({
    from,
    fromId,
    to,
    toId,
    value,
    status,
    type,
    remarks,
    completeTs,
    ts,
  }) {
    return {
      from,
      fromId,
      to,
      toId,
      value,
      status,
      type,
      remarks,
      completeTs,
      ts,
    };
  },
  filterMissionData(m) {
    const {
      id,
      reward,
      done,
      seen,
      bonusId,
      isClaimed,
    } = m;
    const misc = {};
    GETTING_STARTED_TASKS.forEach((task) => {
      if (m[task]) misc[task] = m[task];
    });
    return {
      id,
      reward,
      done,
      seen,
      bonusId,
      isClaimed,
      ...misc,
    };
  },
};

export default ValidationHelper;
