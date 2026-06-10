import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { EPaymentProvider } from '@mezon-tutors/shared';
import { AppConfigService } from '../../shared/services/app-config.service';
import { PayosService } from '../payos/payos.service';
import { VnpayService } from '../vnpay/vnpay.service';

export type PaymentCheckoutKind = 'trial' | 'subscription';

@Injectable()
export class PaymentCheckoutService {
  constructor(
    private readonly appConfig: AppConfigService,
    private readonly vnpayService: VnpayService,
    private readonly payosService: PayosService,
  ) {}

  resolveProvider(provider?: EPaymentProvider): EPaymentProvider {
    return provider ?? EPaymentProvider.VNPAY;
  }

  assertGatewayConfigured(provider: EPaymentProvider): void {
    if (provider === EPaymentProvider.PAYOS) {
      if (!this.payosService.isConfigured()) {
        throw new ServiceUnavailableException('PayOS is not configured; cannot create payment');
      }
      return;
    }

    if (!this.vnpayService.isConfigured()) {
      throw new ServiceUnavailableException('VNPay is not configured; cannot create payment');
    }
  }

  async createCheckout(params: {
    provider: EPaymentProvider;
    resourceId: string;
    amount: number;
    description: string;
    checkoutKind: PaymentCheckoutKind;
    clientIp: string;
  }): Promise<{
    paymentRef: string;
    paymentUrl: string;
    paymentProvider: EPaymentProvider;
  }> {
    const publicApi = this.appConfig.publicApiBaseUrl.replace(/\/$/, '');
    const routeSegment =
      params.checkoutKind === 'trial' ? 'trial-lesson' : 'subscription-enrollment';

    if (params.provider === EPaymentProvider.PAYOS) {
      const orderCode = this.payosService.generateOrderCode();
      const { checkoutUrl } = await this.payosService.createPaymentLink({
        orderCode,
        amount: params.amount,
        description: params.description,
        returnUrl: `${publicApi}/api/webhook/payos/${routeSegment}/return`,
        cancelUrl: `${publicApi}/api/webhook/payos/${routeSegment}/cancel`,
      });

      return {
        paymentRef: String(orderCode),
        paymentUrl: checkoutUrl,
        paymentProvider: EPaymentProvider.PAYOS,
      };
    }

    const vnpTxnRef = params.resourceId.replaceAll('-', '').slice(0, 32);
    const checkoutUrl = this.vnpayService.createPaymentUrl({
      vnp_Amount: params.amount,
      vnp_OrderInfo: params.description,
      vnp_TxnRef: vnpTxnRef,
      vnp_ReturnUrl: `${publicApi}/api/webhook/vnpay/${routeSegment}/return`,
      vnp_IpAddr: params.clientIp.trim() || '127.0.0.1',
    });

    return {
      paymentRef: vnpTxnRef,
      paymentUrl: checkoutUrl,
      paymentProvider: EPaymentProvider.VNPAY,
    };
  }
}
