import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { ELessonChangeLessonType } from '@mezon-tutors/db';
import { MAX_LESSON_COMPLAINT_ATTACHMENTS } from '@mezon-tutors/shared';

export class LessonComplaintAttachmentDto {
  @IsUrl({ require_protocol: true })
  url!: string;

  @IsString()
  @IsNotEmpty()
  publicId!: string;
}

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

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MAX_LESSON_COMPLAINT_ATTACHMENTS)
  @ValidateNested({ each: true })
  @Type(() => LessonComplaintAttachmentDto)
  attachments?: LessonComplaintAttachmentDto[];
}
