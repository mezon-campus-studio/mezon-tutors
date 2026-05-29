import { IsOptional, IsString } from 'class-validator';

export class ReviewLessonComplaintDto {
  @IsOptional()
  @IsString()
  adminNote?: string;
}
