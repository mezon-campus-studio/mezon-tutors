import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { MezonBotModule } from '../mezon-bot/mezon-bot.module';
import { NotificationModule } from '../notification/notification.module';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';
import { TutorApplicationController } from './tutor-application.controller';
import { TutorApplicationService } from './tutor-application.service';
import { TutorApplicationMapper } from './tutor-application.mapper';

@Module({
  imports: [PrismaModule, AuthModule, NotificationModule, MezonBotModule, CloudinaryModule],
  controllers: [TutorApplicationController],
  providers: [TutorApplicationService, TutorApplicationMapper],
  exports: [TutorApplicationService, TutorApplicationMapper],
})
export class TutorApplicationModule {}
