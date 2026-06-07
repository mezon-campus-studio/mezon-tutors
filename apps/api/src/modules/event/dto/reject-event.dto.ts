import { EVENT_CONTENT_LIMITS } from '@mezon-tutors/shared';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class RejectEventDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(EVENT_CONTENT_LIMITS.rejectedReason)
  reason!: string;
}
