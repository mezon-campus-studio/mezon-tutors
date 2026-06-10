import { Type } from 'class-transformer'
import { ECurrency } from '@mezon-tutors/db'
import { EPaymentProvider } from '@mezon-tutors/shared'
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  Min,
  ValidateNested,
} from 'class-validator'

export class SubscriptionEnrollmentSlotBodyDto {
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  date: string

  @IsString()
  @Matches(/^\d{2}:\d{2}$/)
  startTime: string

  @IsString()
  @Matches(/^\d{2}:\d{2}$/)
  endTime: string
}

export class CreateSubscriptionEnrollmentBodyDto {
  @IsUUID()
  tutorId: string

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(7)
  lessonsPerWeek: number

  @IsEnum(ECurrency)
  currency: ECurrency

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => SubscriptionEnrollmentSlotBodyDto)
  slots: SubscriptionEnrollmentSlotBodyDto[]

  @IsOptional()
  @IsBoolean()
  useWalletBalance?: boolean

  @IsOptional()
  @IsEnum(EPaymentProvider)
  paymentProvider?: EPaymentProvider
}
