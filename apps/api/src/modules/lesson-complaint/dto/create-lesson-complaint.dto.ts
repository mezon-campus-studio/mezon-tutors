import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateIf,
} from 'class-validator';
import { ELessonChangeLessonType } from '@mezon-tutors/db';

export class CreateLessonComplaintDto {
  @IsEnum(ELessonChangeLessonType)
  lessonType!: ELessonChangeLessonType;

  @ValidateIf((o: CreateLessonComplaintDto) => o.lessonType === ELessonChangeLessonType.TRIAL)
  @IsUUID()
  trialLessonBookingId?: string;

  @ValidateIf(
    (o: CreateLessonComplaintDto) => o.lessonType === ELessonChangeLessonType.SUBSCRIPTION
  )
  @IsUUID()
  subscriptionEnrollmentId?: string;

  @ValidateIf(
    (o: CreateLessonComplaintDto) => o.lessonType === ELessonChangeLessonType.SUBSCRIPTION
  )
  @IsInt()
  @Min(0)
  subscriptionSlotIndex?: number;

  @ValidateIf(
    (o: CreateLessonComplaintDto) => o.lessonType === ELessonChangeLessonType.SUBSCRIPTION
  )
  @IsString()
  @IsNotEmpty()
  lessonStartAt?: string;

  @IsString()
  @IsNotEmpty()
  reason!: string;

  @IsOptional()
  @IsString()
  message?: string;
}
