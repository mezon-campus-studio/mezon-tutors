import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DEFAULT_TIMEZONE } from '@mezon-tutors/shared';
import { SubscriptionService } from './subscription.service';

@Injectable()
export class SubscriptionEnrollmentSchedulerService {
  private readonly logger = new Logger(SubscriptionEnrollmentSchedulerService.name);

  constructor(private readonly subscriptionService: SubscriptionService) {}

  @Cron(CronExpression.EVERY_MINUTE, { timeZone: DEFAULT_TIMEZONE })
  async expireStalePendingPaymentEnrollments(): Promise<void> {
    try {
      const count =
        await this.subscriptionService.expireStalePendingPaymentEnrollments();
      if (count > 0) {
        this.logger.log(
          `Expired ${count} subscription enrollment(s) after payment hold`,
        );
      }
    } catch (error) {
      this.logger.error(
        'Failed to expire stale pending payment subscription enrollments',
        error,
      );
    }
  }
}
