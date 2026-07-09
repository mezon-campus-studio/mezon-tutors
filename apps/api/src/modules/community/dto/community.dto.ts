import {
  COMMUNITY_CONTENT_LIMITS,
  type CommunityExerciseDifficulty,
  type CommunityExerciseType,
  type CommunityMediaType,
  type CommunityPostType,
  type CommunityReportReason,
} from '@mezon-tutors/shared';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import {
  CommunityExerciseDifficulty as PrismaExerciseDifficulty,
  CommunityExerciseType as PrismaExerciseType,
  CommunityMediaType as PrismaMediaType,
  CommunityPostType as PrismaPostType,
  CommunityReportReason as PrismaReportReason,
} from '@mezon-tutors/db';

const limits = COMMUNITY_CONTENT_LIMITS;

export class CreateCommunityMediaDto {
  @IsEnum(PrismaMediaType)
  type!: CommunityMediaType;

  @IsUrl()
  url!: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class CreateCommunityExerciseDto {
  @IsEnum(PrismaExerciseType)
  exerciseType!: CommunityExerciseType;

  @IsOptional()
  @IsEnum(PrismaExerciseDifficulty)
  difficulty?: CommunityExerciseDifficulty;

  @IsOptional()
  @IsString()
  @MaxLength(limits.content)
  explanation?: string;

  @IsObject()
  payload!: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  correctAnswer?: Record<string, unknown>;
}

export class CreateCommunityPostDto {
  @IsEnum(PrismaPostType)
  type!: CommunityPostType;

  @IsString()
  @IsNotEmpty()
  @MaxLength(limits.content)
  content!: string;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  tagIds?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(limits.tagName, { each: true })
  tagNames?: string[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateCommunityMediaDto)
  media?: CreateCommunityMediaDto[];

  @IsOptional()
  @ValidateNested()
  @Type(() => CreateCommunityExerciseDto)
  exercise?: CreateCommunityExerciseDto;
}

export class UpdateCommunityPostDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(limits.content)
  content?: string;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  tagIds?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(limits.tagName, { each: true })
  tagNames?: string[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateCommunityMediaDto)
  media?: CreateCommunityMediaDto[];
}

export class CreateCommunityCommentDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(limits.comment)
  content!: string;

  @IsOptional()
  @IsUUID('4')
  parentId?: string;
}

export class CreateCommunitySubmissionDto {
  @IsObject()
  answer!: Record<string, unknown>;
}

export class CreateCommunityReportDto {
  @IsOptional()
  @IsUUID('4')
  postId?: string;

  @IsOptional()
  @IsUUID('4')
  commentId?: string;

  @IsEnum(PrismaReportReason)
  reason!: CommunityReportReason;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;
}

export class CommunityFeedQueryDto {
  @IsOptional()
  @IsString()
  sort?: string;

  @IsOptional()
  @IsEnum(PrismaPostType)
  type?: CommunityPostType;

  @IsOptional()
  @Type(() => Boolean)
  following?: boolean;

  @IsOptional()
  @IsString()
  tag?: string;

  @IsOptional()
  @IsUUID('4')
  authorId?: string;

  @IsOptional()
  @IsString()
  cursor?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;
}

export class CommunitySearchQueryDto {
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsEnum(PrismaPostType)
  type?: CommunityPostType;

  @IsOptional()
  @IsString()
  tag?: string;

  @IsOptional()
  @IsUUID('4')
  authorId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;
}
