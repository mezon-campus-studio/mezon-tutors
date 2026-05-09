import { Module } from '@nestjs/common'
import { PrismaModule } from '../../prisma/prisma.module'
import { NotificationModule } from '../notification/notification.module'
import { VnpayModule } from '../vnpay/vnpay.module'
import { WebhookController } from './webhook.controller'
import { WebhookService } from './webhook.service'

@Module({
  imports: [PrismaModule, VnpayModule, NotificationModule],
  controllers: [WebhookController],
  providers: [WebhookService],
})
export class WebhookModule {}
