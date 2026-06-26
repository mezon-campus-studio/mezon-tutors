import { IsEnum, IsUUID } from 'class-validator';
import { ELearningAction } from '@prisma/client';

export class LogLearningDto {
  @IsUUID()
  vocabularyWordId: string;

  @IsEnum(ELearningAction)
  action: ELearningAction;
}
