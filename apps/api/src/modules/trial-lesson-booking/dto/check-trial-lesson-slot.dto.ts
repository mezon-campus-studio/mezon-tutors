import { Type } from 'class-transformer'
import { IsInt, IsISO8601, IsOptional, IsUUID, Min } from 'class-validator'

export class CheckTrialLessonSlotQueryDto {
  @IsUUID()
  tutorId!: string

  @IsISO8601()
  startAt!: string

  @Type(() => Number)
  @IsInt()
  @Min(1)
  durationMinutes!: number

  @IsOptional()
  timezone?: string

  @IsOptional()
  @IsUUID()
  excludeBookingId?: string
}
