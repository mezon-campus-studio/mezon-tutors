import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { PayOS, WebhookError } from '@payos/node';
import type { Webhook, WebhookData } from '@payos/node/lib/resources/webhooks/webhook';
import { AppConfigService } from '../../shared/services/app-config.service';

export type CreatePayosPaymentLinkInput = {
  orderCode: number;
  amount: number;
  description: string;
  returnUrl: string;
  cancelUrl: string;
};

@Injectable()
export class PayosService {
  constructor(private readonly appConfig: AppConfigService) {}

  isConfigured(): boolean {
    const config = this.appConfig.payosConfig;
    return Boolean(config.clientId && config.apiKey && config.checksumKey);
  }

  generateOrderCode(): number {
    const millis = Date.now();
    const random = Math.floor(Math.random() * 1000);
    return Number(`${String(millis).slice(-12)}${String(random).padStart(3, '0')}`);
  }

  async createPaymentLink(input: CreatePayosPaymentLinkInput): Promise<{ checkoutUrl: string }> {
    const client = this.getClient();
    const result = await client.paymentRequests.create({
      orderCode: input.orderCode,
      amount: input.amount,
      description: input.description,
      returnUrl: input.returnUrl,
      cancelUrl: input.cancelUrl,
    });

    const checkoutUrl =
      typeof result === 'object' && result !== null && 'checkoutUrl' in result
        ? result.checkoutUrl
        : undefined;

    if (!checkoutUrl) {
      throw new ServiceUnavailableException('PayOS response did not include checkoutUrl');
    }

    return { checkoutUrl };
  }

  async confirmWebhook(webhookUrl: string) {
    const client = this.getClient();
    return client.webhooks.confirm(webhookUrl);
  }

  async verifyWebhook(webhook: Webhook): Promise<WebhookData> {
    const client = this.getClient();
    try {
      return await client.webhooks.verify(webhook);
    } catch (error) {
      if (error instanceof WebhookError) {
        throw error;
      }
      throw error;
    }
  }

  private getClient(): PayOS {
    if (!this.isConfigured()) {
      throw new ServiceUnavailableException('PayOS is not configured');
    }

    const config = this.appConfig.payosConfig;
    return new PayOS({
      clientId: config.clientId,
      apiKey: config.apiKey,
      checksumKey: config.checksumKey,
    });
  }
}
