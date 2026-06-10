import { Type } from 'class-transformer'
import { ECurrency } from '@mezon-tutors/db'
import { EPaymentProvider } from '@mezon-tutors/shared'
import { IsBoolean, IsDateString, IsEnum, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator'

export class CreateTrialLessonBookingDto {
  @IsUUID()
  tutorId: string

  @IsDateString()
  startAt: string

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek: number

  @Type(() => Number)
  @IsInt()
  @Min(30)
  @Max(60)
  durationMinutes: number

  @IsOptional()
  @IsEnum(ECurrency)
  currency?: ECurrency

  @IsOptional()
  useWalletBalance?: boolean

  @IsOptional()
  @IsEnum(EPaymentProvider)
  paymentProvider?: EPaymentProvider
}
