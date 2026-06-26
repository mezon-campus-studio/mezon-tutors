import { Module } from '@nestjs/common';
import { LearningLogController } from './learning-log.controller';
import { LearningLogService } from './learning-log.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [LearningLogController],
  providers: [LearningLogService],
  exports: [LearningLogService],
})
export class LearningLogModule {}
