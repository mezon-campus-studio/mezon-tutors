export enum EPaymentProvider {
  VNPAY = 'vnpay',
  PAYOS = 'payos',
}

export const PAYMENT_PROVIDERS = [EPaymentProvider.VNPAY, EPaymentProvider.PAYOS] as const;

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
  return EPaymentProvider.VNPAY;
}
