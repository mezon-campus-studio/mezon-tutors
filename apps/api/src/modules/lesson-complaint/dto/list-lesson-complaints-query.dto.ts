import { IsIn, IsOptional } from 'class-validator';
import { LESSON_COMPLAINT_STATUS_FILTERS, type LessonComplaintStatusFilter } from '@mezon-tutors/shared';

export class ListLessonComplaintsQueryDto {
  @IsOptional()
  @IsIn(LESSON_COMPLAINT_STATUS_FILTERS)
  status?: LessonComplaintStatusFilter;
}
