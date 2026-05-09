import { ENotificationType } from '@mezon-tutors/db'
import { IsEnum, IsObject, IsOptional, IsString, MaxLength } from 'class-validator'

export class CreateNotificationDto {
  @IsString()
  @MaxLength(255)
  title: string

  @IsString()
  content: string

  @IsEnum(ENotificationType)
  type: ENotificationType

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>

  @IsOptional()
  @IsString()
  @MaxLength(255)
  i18nKey?: string

  @IsOptional()
  @IsObject()
  i18nParams?: Record<string, unknown>

  @IsOptional()
  @IsString()
  @MaxLength(255)
  dedupeKey?: string
}
