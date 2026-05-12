import { Module } from '@nestjs/common'
import { VnpayModule } from '../vnpay/vnpay.module'
import { PrismaModule } from '../../prisma/prisma.module'
import { NotificationModule } from '../notification/notification.module'
import { TrialLessonBookingController } from './trial-lesson-booking.controller'
import { TrialLessonBookingService } from './trial-lesson-booking.service'

@Module({
  imports: [PrismaModule, VnpayModule, NotificationModule],
  controllers: [TrialLessonBookingController],
  providers: [TrialLessonBookingService],
  exports: [TrialLessonBookingService],
})
export class TrialLessonBookingModule {}
