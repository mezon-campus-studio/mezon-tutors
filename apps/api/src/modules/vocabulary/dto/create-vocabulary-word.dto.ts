import { IsOptional, IsString } from 'class-validator';

export class CreateVocabularyWordDto {
  @IsString()
  word: string;

  @IsOptional()
  @IsString()
  phonetic?: string;

  @IsString()
  partOfSpeech: string;

  @IsString()
  definition: string;

  @IsOptional()
  @IsString()
  example?: string;

  @IsOptional()
  @IsString()
  audioUrl?: string;
}
