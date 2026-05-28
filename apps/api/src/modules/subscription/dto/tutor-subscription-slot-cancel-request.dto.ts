import { IsISO8601, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class TutorSubscriptionSlotCancelRequestDto {
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  reason!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  message?: string;

  @IsISO8601()
  occurrenceStartAt!: string;
}
