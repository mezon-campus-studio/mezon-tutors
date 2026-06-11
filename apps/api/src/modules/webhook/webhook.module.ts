import { Module } from '@nestjs/common'
import { PrismaModule } from '../../prisma/prisma.module'
import { LessonSettlementModule } from '../lesson-settlement/lesson-settlement.module'
import { NotificationModule } from '../notification/notification.module'
import { PayosModule } from '../payos/payos.module'
import { SepayModule } from '../sepay/sepay.module'
import { VnpayModule } from '../vnpay/vnpay.module'
import { WalletModule } from '../wallet/wallet.module'
import { TrialLessonBookingModule } from '../trial-lesson-booking/trial-lesson-booking.module'
import { GoogleCalendarModule } from '../google-calendar/google-calendar.module'
import { WebhookController } from './webhook.controller'
import { WebhookService } from './webhook.service'

@Module({
  imports: [
    PrismaModule,
    VnpayModule,
    PayosModule,
    SepayModule,
    NotificationModule,
    LessonSettlementModule,
    WalletModule,
    TrialLessonBookingModule,
    GoogleCalendarModule,
  ],
  controllers: [WebhookController],
  providers: [WebhookService],
})
export class WebhookModule {}
