import { Module } from '@nestjs/common'
import { VnpayModule } from '../vnpay/vnpay.module'
import { PrismaModule } from '../../prisma/prisma.module'
import { NotificationModule } from '../notification/notification.module'
import { WalletModule } from '../wallet/wallet.module'
import { LessonSettlementModule } from '../lesson-settlement/lesson-settlement.module'
import { TrialLessonBookingController } from './trial-lesson-booking.controller'
import { TrialLessonBookingService } from './trial-lesson-booking.service'

@Module({
  imports: [PrismaModule, VnpayModule, NotificationModule, WalletModule, LessonSettlementModule],
  controllers: [TrialLessonBookingController],
  providers: [TrialLessonBookingService],
  exports: [TrialLessonBookingService],
})
export class TrialLessonBookingModule {}
