import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator'

export class TutorRescheduleRequestDto {
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  reason: string

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  message?: string
}
