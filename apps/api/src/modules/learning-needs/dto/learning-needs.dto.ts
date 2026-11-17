import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayUnique,
  Equals,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import {
  LEARNING_CURRENT_LEVELS,
  LEARNING_FOCUS_AREAS,
  LEARNING_GOALS,
  LEARNING_INTERESTS,
  LEARNING_TIME_WINDOWS,
  LEARNING_USAGE_SITUATIONS,
  LEARNING_WEEKDAYS,
  type LearningCurrentLevel,
  type LearningFocusArea,
  type LearningGoal,
  type LearningInterest,
  type LearningNeedsAnswersV1,
  type LearningTimeWindow,
  type LearningUsageSituation,
  type LearningWeekday,
} from '@mezon-tutors/shared';

export class LearningNeedsAnswersDto implements LearningNeedsAnswersV1 {
  @Equals(1)
  schemaVersion!: 1;

  @IsOptional()
  @IsIn(LEARNING_GOALS)
  learningGoal!: LearningGoal | null;

  @IsArray()
  @ArrayUnique()
  @ArrayMaxSize(LEARNING_USAGE_SITUATIONS.length)
  @IsIn(LEARNING_USAGE_SITUATIONS, { each: true })
  usageSituations!: LearningUsageSituation[];

  @IsArray()
  @ArrayUnique()
  @ArrayMaxSize(LEARNING_FOCUS_AREAS.length)
  @IsIn(LEARNING_FOCUS_AREAS, { each: true })
  focusAreas!: LearningFocusArea[];

  @IsOptional()
  @IsIn(LEARNING_CURRENT_LEVELS)
  currentLevel!: LearningCurrentLevel | null;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  workContext!: string | null;

  @IsOptional()
  @IsBoolean()
  industryKnowledgeRequired!: boolean | null;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  industryContext!: string | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  lessonsPerMonth!: number | null;

  @IsArray()
  @ArrayUnique()
  @ArrayMaxSize(LEARNING_WEEKDAYS.length)
  @IsIn(LEARNING_WEEKDAYS, { each: true })
  preferredWeekdays!: LearningWeekday[];

  @IsArray()
  @ArrayUnique()
  @ArrayMaxSize(LEARNING_TIME_WINDOWS.length)
  @IsIn(LEARNING_TIME_WINDOWS, { each: true })
  preferredTimeWindows!: LearningTimeWindow[];

  @IsOptional()
  @IsString()
  @MaxLength(100)
  timezone!: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  nativeLanguage!: string | null;

  @IsArray()
  @ArrayUnique()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  @MaxLength(64, { each: true })
  otherLanguages!: string[];

  @IsArray()
  @ArrayUnique()
  @ArrayMaxSize(LEARNING_INTERESTS.length)
  @IsIn(LEARNING_INTERESTS, { each: true })
  interests!: LearningInterest[];
}

export class SaveLearningNeedsDraftDto {
  @ValidateNested()
  @Type(() => LearningNeedsAnswersDto)
  answers!: LearningNeedsAnswersDto;

  @IsOptional()
  @IsInt()
  @Min(0)
  expectedDraftRevision?: number;
}

export class ShareLearningNeedsDto {
  @IsInt()
  @Min(1)
  expectedDraftRevision!: number;
}

export class AssociateLearningNeedsChannelDto {
  @IsString()
  @MaxLength(128)
  channelId!: string;
}

export class RecordLearningNeedsSyncFailureDto {
  @IsString()
  @MaxLength(1000)
  error!: string;
}
