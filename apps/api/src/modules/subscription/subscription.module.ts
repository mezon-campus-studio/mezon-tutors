import { Module } from '@nestjs/common'
import { PrismaModule } from '../../prisma/prisma.module'
import { VnpayModule } from '../vnpay/vnpay.module'
import { SubscriptionService } from './subscription.service'
import { SubscriptionPlanController } from './subscription-plan.controller'
import { SubscriptionEnrollmentController } from './subscription-enrollment.controller'

@Module({
  imports: [PrismaModule, VnpayModule],
  controllers: [SubscriptionPlanController, SubscriptionEnrollmentController],
  providers: [SubscriptionService],
  exports: [SubscriptionService],
})
export class SubscriptionModule {}
