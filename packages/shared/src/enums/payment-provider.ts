export enum EPaymentProvider {
  VNPAY = 'vnpay',
  PAYOS = 'payos',
  SEPAY = 'sepay',
}

export const PAYMENT_PROVIDERS = [
  EPaymentProvider.VNPAY,
  EPaymentProvider.PAYOS,
  EPaymentProvider.SEPAY,
] as const;

export function isPaymentProvider(value: string): value is EPaymentProvider {
  return (PAYMENT_PROVIDERS as readonly string[]).includes(value);
}

export function inferPaymentProviderFromUrl(paymentUrl: string | null | undefined): EPaymentProvider {
  if (!paymentUrl) {
    return EPaymentProvider.VNPAY;
  }
  const lower = paymentUrl.toLowerCase();
  if (lower.includes('payos')) {
    return EPaymentProvider.PAYOS;
  }
  if (lower.includes('sepay.vn')) {
    return EPaymentProvider.SEPAY;
  }
  return EPaymentProvider.VNPAY;
}
