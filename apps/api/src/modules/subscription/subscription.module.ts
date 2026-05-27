import { Module } from '@nestjs/common'
import { PrismaModule } from '../../prisma/prisma.module'
import { VnpayModule } from '../vnpay/vnpay.module'
import { WalletModule } from '../wallet/wallet.module'
import { TrialLessonBookingModule } from '../trial-lesson-booking/trial-lesson-booking.module'
import { SubscriptionService } from './subscription.service'
import { SubscriptionPlanController } from './subscription-plan.controller'
import { SubscriptionEnrollmentController } from './subscription-enrollment.controller'

@Module({
  imports: [PrismaModule, VnpayModule, WalletModule, TrialLessonBookingModule],
  controllers: [SubscriptionPlanController, SubscriptionEnrollmentController],
  providers: [SubscriptionService],
  exports: [SubscriptionService],
})
export class SubscriptionModule {}
