import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { GoogleCalendarController } from './google-calendar.controller';
import { GoogleCalendarService } from './google-calendar.service';
import { GoogleCalendarSyncService } from './google-calendar-sync.service';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [GoogleCalendarController],
  providers: [GoogleCalendarService, GoogleCalendarSyncService],
  exports: [GoogleCalendarService, GoogleCalendarSyncService],
})
export class GoogleCalendarModule {}
