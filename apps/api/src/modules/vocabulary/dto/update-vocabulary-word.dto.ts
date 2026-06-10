import { VocabularyWordStatus } from '@mezon-tutors/db';
import { IsEnum } from 'class-validator';

export class UpdateVocabularyWordDto {
  @IsEnum(VocabularyWordStatus)
  status: VocabularyWordStatus;
}
