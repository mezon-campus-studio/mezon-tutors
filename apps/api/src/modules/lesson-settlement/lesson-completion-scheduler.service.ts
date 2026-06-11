import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DEFAULT_TIMEZONE } from '@mezon-tutors/shared';
import { LessonCompletionService } from './lesson-completion.service';

@Injectable()
export class LessonCompletionSchedulerService {
  private readonly logger = new Logger(LessonCompletionSchedulerService.name);

  constructor(private readonly lessonCompletionService: LessonCompletionService) {}

  @Cron(CronExpression.EVERY_MINUTE, { timeZone: DEFAULT_TIMEZONE })
  async processDueLessonCompletions(): Promise<void> {
    try {
      await this.lessonCompletionService.processDueCompletions();
    } catch (error) {
      this.logger.error('Failed to auto-complete due lessons', error);
    }
  }

  @Cron(CronExpression.EVERY_10_MINUTES, { timeZone: DEFAULT_TIMEZONE })
  async reconcileCompletionSchedules(): Promise<void> {
    try {
      await this.lessonCompletionService.reconcilePendingSchedules();
    } catch (error) {
      this.logger.error('Failed to reconcile lesson completion schedules', error);
    }
  }
}
