export const VNPAY_MIN_AMOUNT_VND = 10_000;
export const VNPAY_MIN_AMOUNT_VND_BIGINT = 10_000n;

export type WalletPaymentSplit = {
  deductFromWallet: number;
  vnpayAmount: number;
};

export type WalletPaymentSplitBigInt = {
  deductFromWallet: bigint;
  vnpayAmount: bigint;
};

export function computeWalletPaymentSplitBigInt(
  grossAmount: bigint,
  walletBalance: bigint,
  useWalletBalance: boolean,
): WalletPaymentSplitBigInt {
  if (!useWalletBalance) {
    return { deductFromWallet: 0n, vnpayAmount: grossAmount };
  }

  if (walletBalance >= grossAmount) {
    return { deductFromWallet: grossAmount, vnpayAmount: 0n };
  }

  const remaining = grossAmount - walletBalance;
  if (remaining >= VNPAY_MIN_AMOUNT_VND_BIGINT) {
    return { deductFromWallet: walletBalance, vnpayAmount: remaining };
  }

  return {
    deductFromWallet: grossAmount - VNPAY_MIN_AMOUNT_VND_BIGINT,
    vnpayAmount: VNPAY_MIN_AMOUNT_VND_BIGINT,
  };
}

export function computeWalletPaymentSplit(
  lessonPrice: number,
  walletBalance: number,
  useWalletBalance: boolean,
): WalletPaymentSplit {
  const split = computeWalletPaymentSplitBigInt(
    BigInt(Math.round(lessonPrice)),
    BigInt(Math.round(walletBalance)),
    useWalletBalance,
  );
  return {
    deductFromWallet: Number(split.deductFromWallet),
    vnpayAmount: Number(split.vnpayAmount),
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
