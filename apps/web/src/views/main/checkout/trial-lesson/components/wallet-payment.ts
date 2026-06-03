export const VNPAY_MIN_AMOUNT_VND = 10_000;

export type WalletPaymentSplit = {
  deductFromWallet: number;
  vnpayAmount: number;
};

export function computeWalletPaymentSplit(
  lessonPrice: number,
  walletBalance: number,
  useWalletBalance: boolean,
): WalletPaymentSplit {
  if (!useWalletBalance) {
    return { deductFromWallet: 0, vnpayAmount: lessonPrice };
  }

  if (walletBalance >= lessonPrice) {
    return { deductFromWallet: lessonPrice, vnpayAmount: 0 };
  }

  const remaining = lessonPrice - walletBalance;
  if (remaining >= VNPAY_MIN_AMOUNT_VND) {
    return { deductFromWallet: walletBalance, vnpayAmount: remaining };
  }

  return {
    deductFromWallet: lessonPrice - VNPAY_MIN_AMOUNT_VND,
    vnpayAmount: VNPAY_MIN_AMOUNT_VND,
  };
}

/** Case 3: remainder after full wallet use is below VNPay minimum — wallet deduct is capped. */
export function isVnpayMinWalletCapApplied(
  lessonPrice: number,
  walletBalance: number,
  split: WalletPaymentSplit,
  useWalletBalance: boolean,
): boolean {
  if (!useWalletBalance || split.vnpayAmount === 0) {
    return false;
  }
  if (walletBalance >= lessonPrice) {
    return false;
  }
  const remainderAfterFullWallet = lessonPrice - walletBalance;
  return (
    remainderAfterFullWallet > 0 &&
    remainderAfterFullWallet < VNPAY_MIN_AMOUNT_VND
  );
}
