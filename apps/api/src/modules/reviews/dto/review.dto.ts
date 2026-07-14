import { OmitType } from '@nestjs/mapped-types';
import { IsInt, IsString, MaxLength, Max, Min } from 'class-validator';
import { REVIEW_VALIDATION } from '@mezon-tutors/shared';

export class CreateReviewDto {
  @IsString()
  tutorId: string;

  @IsInt()
  @Min(REVIEW_VALIDATION.MIN_RATING)
  @Max(REVIEW_VALIDATION.MAX_RATING)
  rating: number;

  @IsString()
  @MaxLength(REVIEW_VALIDATION.MAX_COMMENT_LENGTH)
  comment: string;
}

export class UpdateReviewDto extends OmitType(CreateReviewDto, ['tutorId'] as const) {}
