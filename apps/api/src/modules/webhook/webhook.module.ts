import { Module } from '@nestjs/common'
import { PrismaModule } from '../../prisma/prisma.module'
import { LessonSettlementModule } from '../lesson-settlement/lesson-settlement.module'
import { NotificationModule } from '../notification/notification.module'
import { VnpayModule } from '../vnpay/vnpay.module'
import { WalletModule } from '../wallet/wallet.module'
import { TrialLessonBookingModule } from '../trial-lesson-booking/trial-lesson-booking.module'
import { WebhookController } from './webhook.controller'
import { WebhookService } from './webhook.service'

@Module({
  imports: [
    PrismaModule,
    VnpayModule,
    NotificationModule,
    LessonSettlementModule,
    WalletModule,
    TrialLessonBookingModule,
  ],
  controllers: [WebhookController],
  providers: [WebhookService],
})
export class WebhookModule {}
