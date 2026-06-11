import { Module } from '@nestjs/common';
import { PayosModule } from '../payos/payos.module';
import { SepayModule } from '../sepay/sepay.module';
import { VnpayModule } from '../vnpay/vnpay.module';
import { PaymentCheckoutService } from './payment-checkout.service';

@Module({
  imports: [VnpayModule, PayosModule, SepayModule],
  providers: [PaymentCheckoutService],
  exports: [PaymentCheckoutService],
})
export class PaymentModule {}
