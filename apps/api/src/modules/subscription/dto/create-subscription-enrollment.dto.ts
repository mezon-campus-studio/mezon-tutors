import { Type } from 'class-transformer'
import { ECurrency } from '@mezon-tutors/db'
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsString,
  IsUUID,
  Matches,
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

  @IsUUID()
  planId: string

  @IsEnum(ECurrency)
  currency: ECurrency

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => SubscriptionEnrollmentSlotBodyDto)
  slots: SubscriptionEnrollmentSlotBodyDto[]
}
