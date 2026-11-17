import { Module } from '@nestjs/common';
import { LearningNeedsController } from './learning-needs.controller';
import { LearningNeedsService } from './learning-needs.service';

@Module({
  controllers: [LearningNeedsController],
  providers: [LearningNeedsService],
  exports: [LearningNeedsService],
})
export class LearningNeedsModule {}
