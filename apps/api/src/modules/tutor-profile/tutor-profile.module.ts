import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { NotificationModule } from '../notification/notification.module';
import { TutorProfileController } from './tutor-profile.controller';
import { TutorSetupChecklistService } from './tutor-setup-checklist.service';
import { TutorProfileService } from './tutor-profile.service';

@Module({
  imports: [PrismaModule, NotificationModule],
  controllers: [TutorProfileController],
  providers: [TutorProfileService, TutorSetupChecklistService],
  exports: [TutorProfileService, TutorSetupChecklistService],
})
export class TutorProfileModule {}
