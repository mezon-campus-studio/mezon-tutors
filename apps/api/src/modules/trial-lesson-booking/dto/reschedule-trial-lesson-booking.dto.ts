import { Type } from 'class-transformer'
import { IsDateString, IsInt, Max, Min } from 'class-validator'

export class RescheduleTrialLessonBookingDto {
  @IsDateString()
  startAt: string

  @Type(() => Number)
  @IsInt()
  @Min(30)
  @Max(60)
  durationMinutes: number
}
