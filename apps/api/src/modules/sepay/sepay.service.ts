import {
  Injectable,
  InternalServerErrorException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { SePayPgClient } from 'sepay-pg-node';
import { AppConfigService } from '../../shared/services/app-config.service';

export type SepayCheckoutKind = 'trial' | 'subscription';

export type SepayCheckoutInput = {
  invoiceNumber: string;
  amount: number;
  description: string;
  checkoutKind: SepayCheckoutKind;
};

export type SepayOrderSnapshot = {
  orderInvoiceNumber: string;
  orderStatus: string | undefined;
  transactionStatus: string | undefined;
};

@Injectable()
export class SepayService {
  constructor(private readonly appConfig: AppConfigService) {}

  isConfigured(): boolean {
    const config = this.appConfig.sepayConfig;
    return Boolean(config.merchantId && config.secretKey);
  }

  buildInvoiceNumber(resourceId: string): string {
    return resourceId.replaceAll('-', '').slice(0, 32);
  }

  /**
   * Server-side POST to SePay checkout/init, then return the payment page URL
   * from the redirect Location header (same flow as auto-submit HTML form).
   */
  async initPaymentPageUrl(input: SepayCheckoutInput): Promise<string> {
    const fields = this.createCheckoutFormFields(input);
    const initUrl = this.getCheckoutActionUrl();
    const body = this.toUrlEncodedBody(fields);

    const response = await fetch(initUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
      redirect: 'manual',
    });

    const location = response.headers.get('location');
    if (location) {
      return this.resolveRedirectUrl(location, initUrl);
    }

    if (response.status >= 300 && response.status < 400) {
      throw new InternalServerErrorException('SePay checkout init returned redirect without Location');
    }

    if (!response.ok) {
      const detail = (await response.text()).trim().slice(0, 200);
      throw new InternalServerErrorException(
        detail ? `SePay checkout init failed: ${detail}` : 'SePay checkout init failed',
      );
    }

    return this.buildPaymentPageUrlFromFields(fields);
  }

  createCheckoutFormFields(input: SepayCheckoutInput): Record<string, string | number> {
    const client = this.getClient();
    const callbackQuery = `order_invoice_number=${encodeURIComponent(input.invoiceNumber)}`;

    return client.checkout.initOneTimePaymentFields({
      operation: 'PURCHASE',
      order_invoice_number: input.invoiceNumber,
      order_amount: input.amount,
      currency: 'VND',
      order_description: input.description,
      success_url: this.buildCallbackUrl(input.checkoutKind, 'return', callbackQuery),
      error_url: this.buildCallbackUrl(input.checkoutKind, 'error', callbackQuery),
      cancel_url: this.buildCallbackUrl(input.checkoutKind, 'cancel', callbackQuery),
    });
  }

  verifyIpnSecretKey(headerValue: string | undefined): boolean {
    if (!this.isConfigured()) {
      return false;
    }
    const expected = this.appConfig.sepayConfig.secretKey;
    return Boolean(headerValue && headerValue === expected);
  }

  async retrieveOrder(invoiceNumber: string): Promise<SepayOrderSnapshot | null> {
    if (!this.isConfigured()) {
      return null;
    }

    try {
      const client = this.getClient();
      const response = await client.order.retrieve(invoiceNumber);
      const data = response.data?.data ?? response.data;
      return {
        orderInvoiceNumber: data?.order_invoice_number ?? invoiceNumber,
        orderStatus: data?.order_status,
        transactionStatus: data?.transaction_status,
      };
    } catch {
      return null;
    }
  }

  isCapturedOrder(order: SepayOrderSnapshot | null | undefined): boolean {
    return (order?.orderStatus ?? '').trim().toUpperCase() === 'CAPTURED';
  }

  private getCheckoutActionUrl(): string {
    return this.getClient().checkout.initCheckoutUrl();
  }

  private buildPaymentPageUrlFromFields(fields: Record<string, string | number>): string {
    const config = this.appConfig.sepayConfig;
    const base =
      config.env === 'sandbox' ? 'https://pgapi-sandbox.sepay.vn' : 'https://pgapi.sepay.vn';
    return `${base}?${this.toUrlEncodedBody(fields)}`;
  }

  private toUrlEncodedBody(fields: Record<string, string | number>): string {
    const body = new URLSearchParams();
    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined && value !== null && value !== '') {
        body.set(key, String(value));
      }
    }
    return body.toString();
  }

  private resolveRedirectUrl(location: string, initUrl: string): string {
    try {
      return new URL(location, initUrl).toString();
    } catch {
      return location;
    }
  }

  private buildCallbackUrl(
    checkoutKind: SepayCheckoutKind,
    outcome: 'return' | 'error' | 'cancel',
    query: string,
  ): string {
    const publicApi = this.appConfig.publicApiBaseUrl.replace(/\/$/, '');
    const routeSegment =
      checkoutKind === 'trial' ? 'trial-lesson' : 'subscription-enrollment';
    return `${publicApi}/api/webhook/sepay/${routeSegment}/${outcome}?${query}`;
  }

  private getClient(): SePayPgClient {
    if (!this.isConfigured()) {
      throw new ServiceUnavailableException('SePay is not configured');
    }

    const config = this.appConfig.sepayConfig;
    return new SePayPgClient({
      env: config.env,
      merchant_id: config.merchantId,
      secret_key: config.secretKey,
    });
  }
}
