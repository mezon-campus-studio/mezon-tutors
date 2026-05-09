import { Module } from '@nestjs/common'
import { MezonBotModule } from '../mezon-bot/mezon-bot.module'
import { NotificationController } from './notification.controller'
import { NotificationReminderService } from './notification-reminder.service'
import { NotificationService } from './notification.service'

@Module({
  imports: [MezonBotModule],
  controllers: [NotificationController],
  providers: [NotificationService, NotificationReminderService],
  exports: [NotificationService],
})
export class NotificationModule {}
