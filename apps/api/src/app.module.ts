import { Module } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from './prisma/prisma.module';
import { SharedModule } from './shared/shared.module';
import { HealthController } from './health.controller';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { AuthModule } from './modules/auth/auth.module';
import { TutorProfileModule } from './modules/tutor-profile/tutor-profile.module';
import { TutorAvailabilityModule } from './modules/tutor-availability/tutor-availability.module';
import { MyLessonsModule } from './modules/my-lessons/my-lessons.module';
import { TutorApplicationModule } from './modules/tutor-application/tutor-application.module';
import { TrialLessonBookingModule } from './modules/trial-lesson-booking/trial-lesson-booking.module';
import { MyScheduleModule } from './modules/my-schedule/my-schedule.module';
import { CloudinaryModule } from './modules/cloudinary/cloudinary.module';
import { ReviewsModule } from './modules/reviews/reviews.module';
import { DmChannelModule } from './modules/dm-channel/dm-channel.module';
import { VnpayModule } from './modules/vnpay/vnpay.module';
import { WebhookModule } from './modules/webhook/webhook.module';
import { NotificationModule } from './modules/notification/notification.module';
import { MezonBotModule } from './modules/mezon-bot/mezon-bot.module';
import { AppService } from './app.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ThrottlerModule.forRoot({
      throttlers: [
        {
          name: 'default',
          ttl: 60000,
          limit: 120,
        },
      ],
    }),
    ScheduleModule.forRoot(),
    SharedModule,
    PrismaModule,
    AuthModule,
    TutorProfileModule,
    TutorAvailabilityModule,
    TutorApplicationModule,
    MyLessonsModule,
    TrialLessonBookingModule,
    MyScheduleModule,
    CloudinaryModule,
    ReviewsModule,
    DmChannelModule,
    VnpayModule,
    WebhookModule,
    NotificationModule,
    MezonBotModule,
  ],
  controllers: [HealthController],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseInterceptor,
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    AppService,
  ],
})
export class AppModule {}
