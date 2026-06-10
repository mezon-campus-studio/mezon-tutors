import { Module } from '@nestjs/common';
import { PayosModule } from '../payos/payos.module';
import { VnpayModule } from '../vnpay/vnpay.module';
import { PaymentCheckoutService } from './payment-checkout.service';

@Module({
  imports: [VnpayModule, PayosModule],
  providers: [PaymentCheckoutService],
  exports: [PaymentCheckoutService],
})
export class PaymentModule {}
