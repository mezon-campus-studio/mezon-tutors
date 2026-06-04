import { IsOptional, IsString, MaxLength } from 'class-validator';

export class RejectTutorLessonComplaintDto {
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  tutorNote?: string;
}
