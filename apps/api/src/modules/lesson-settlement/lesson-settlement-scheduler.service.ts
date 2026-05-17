import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DEFAULT_TIMEZONE } from '@mezon-tutors/shared';
import { LessonSettlementService } from './lesson-settlement.service';

@Injectable()
export class LessonSettlementSchedulerService {
  private readonly logger = new Logger(LessonSettlementSchedulerService.name);

  constructor(private readonly lessonSettlementService: LessonSettlementService) {}

  @Cron(CronExpression.EVERY_10_SECONDS, { timeZone: DEFAULT_TIMEZONE })
  async processDueSettlementJobs(): Promise<void> {
    try {
      await this.lessonSettlementService.processDueJobs();
    } catch (error) {
      this.logger.error('Failed to process lesson settlement jobs', error);
    }
  }

  @Cron(CronExpression.EVERY_10_MINUTES, { timeZone: DEFAULT_TIMEZONE })
  async reconcileSettlementSchedules(): Promise<void> {
    try {
      await this.lessonSettlementService.reconcilePendingSchedules();
    } catch (error) {
      this.logger.error('Failed to reconcile lesson settlement schedules', error);
    }
  }
}
