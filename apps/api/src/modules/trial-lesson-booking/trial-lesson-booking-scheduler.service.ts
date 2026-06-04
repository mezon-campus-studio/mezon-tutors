import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DEFAULT_TIMEZONE } from '@mezon-tutors/shared';
import { TrialLessonBookingService } from './trial-lesson-booking.service';

@Injectable()
export class TrialLessonBookingSchedulerService {
  private readonly logger = new Logger(TrialLessonBookingSchedulerService.name);

  constructor(private readonly trialLessonBookingService: TrialLessonBookingService) {}

  @Cron(CronExpression.EVERY_MINUTE, { timeZone: DEFAULT_TIMEZONE })
  async expireStalePendingPaymentBookings(): Promise<void> {
    try {
      const count =
        await this.trialLessonBookingService.expireStalePendingPaymentBookings();
      if (count > 0) {
        this.logger.log(`Expired ${count} trial lesson booking(s) after payment hold`);
      }
    } catch (error) {
      this.logger.error('Failed to expire stale pending payment bookings', error);
    }
  }
}
