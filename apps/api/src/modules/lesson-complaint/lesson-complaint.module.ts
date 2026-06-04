import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { NotificationModule } from '../notification/notification.module';
import { WalletModule } from '../wallet/wallet.module';
import { LessonComplaintController } from './lesson-complaint.controller';
import { AdminLessonComplaintController } from './admin-lesson-complaint.controller';
import { TutorLessonComplaintController } from './tutor-lesson-complaint.controller';
import { LessonComplaintService } from './lesson-complaint.service';

@Module({
  imports: [PrismaModule, AuthModule, WalletModule, NotificationModule],
  controllers: [
    LessonComplaintController,
    AdminLessonComplaintController,
    TutorLessonComplaintController,
  ],
  providers: [LessonComplaintService],
  exports: [LessonComplaintService],
})
export class LessonComplaintModule {}
