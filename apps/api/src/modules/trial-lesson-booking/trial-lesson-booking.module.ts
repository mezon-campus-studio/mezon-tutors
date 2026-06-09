import { Module } from '@nestjs/common'
import { VnpayModule } from '../vnpay/vnpay.module'
import { PrismaModule } from '../../prisma/prisma.module'
import { NotificationModule } from '../notification/notification.module'
import { WalletModule } from '../wallet/wallet.module'
import { LessonSettlementModule } from '../lesson-settlement/lesson-settlement.module'
import { GoogleCalendarModule } from '../google-calendar/google-calendar.module'
import { TrialLessonBookingController } from './trial-lesson-booking.controller'
import { TrialLessonBookingService } from './trial-lesson-booking.service'
import { TrialLessonBookingSchedulerService } from './trial-lesson-booking-scheduler.service'

@Module({
  imports: [
    PrismaModule,
    VnpayModule,
    NotificationModule,
    WalletModule,
    LessonSettlementModule,
    GoogleCalendarModule,
  ],
  controllers: [TrialLessonBookingController],
  providers: [TrialLessonBookingService, TrialLessonBookingSchedulerService],
  exports: [TrialLessonBookingService],
})
export class TrialLessonBookingModule {}
