import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { NotificationModule } from '../notification/notification.module';
import { LessonSettlementSchedulerService } from './lesson-settlement-scheduler.service';
import { LessonSettlementService } from './lesson-settlement.service';

@Module({
  imports: [PrismaModule, NotificationModule],
  providers: [LessonSettlementService, LessonSettlementSchedulerService],
  exports: [LessonSettlementService],
})
export class LessonSettlementModule {}
