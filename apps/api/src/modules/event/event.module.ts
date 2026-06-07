import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { AdminEventController } from './admin-event.controller';
import { EventService } from './event.service';
import { PublicEventController } from './public-event.controller';
import { UserEventController } from './user-event.controller';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [
    PublicEventController,
    UserEventController,
    AdminEventController,
  ],
  providers: [EventService],
  exports: [EventService],
})
export class EventModule {}
