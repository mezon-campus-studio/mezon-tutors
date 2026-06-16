import { Module } from '@nestjs/common';
import { StudyGroupController } from './study-group.controller';
import { StudyGroupService } from './study-group.service';

@Module({
  controllers: [StudyGroupController],
  providers: [StudyGroupService]
})
export class StudyGroupModule {}
