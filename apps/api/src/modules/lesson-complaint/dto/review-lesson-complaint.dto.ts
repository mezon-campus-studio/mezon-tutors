import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class ReviewLessonComplaintDto {
  @IsOptional()
  @IsString()
  adminNote?: string;

  @IsOptional()
  @IsBoolean()
  acknowledgeWithoutTutorConfirmation?: boolean;
}
