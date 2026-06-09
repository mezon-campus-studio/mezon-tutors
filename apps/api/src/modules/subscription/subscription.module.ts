import { Module } from '@nestjs/common'
import { PrismaModule } from '../../prisma/prisma.module'
import { LessonSettlementModule } from '../lesson-settlement/lesson-settlement.module'
import { GoogleCalendarModule } from '../google-calendar/google-calendar.module'
import { NotificationModule } from '../notification/notification.module'
import { VnpayModule } from '../vnpay/vnpay.module'
import { WalletModule } from '../wallet/wallet.module'
import { TrialLessonBookingModule } from '../trial-lesson-booking/trial-lesson-booking.module'
import { ScheduleModule } from '@nestjs/schedule'
import { SubscriptionService } from './subscription.service'
import { SubscriptionPlanController } from './subscription-plan.controller'
import { SubscriptionEnrollmentController } from './subscription-enrollment.controller'
import { SubscriptionEnrollmentSchedulerService } from './subscription-enrollment-scheduler.service'

@Module({
  imports: [
    PrismaModule,
    VnpayModule,
    WalletModule,
    TrialLessonBookingModule,
    NotificationModule,
    LessonSettlementModule,
    GoogleCalendarModule,
    ScheduleModule,
  ],
  controllers: [SubscriptionPlanController, SubscriptionEnrollmentController],
  providers: [SubscriptionService, SubscriptionEnrollmentSchedulerService],
  exports: [SubscriptionService],
})
export class SubscriptionModule {}
