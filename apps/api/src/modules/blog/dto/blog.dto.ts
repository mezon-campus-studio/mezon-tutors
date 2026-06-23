import { BLOG_CONTENT_LIMITS, BLOG_SLUG_PATTERN } from '@mezon-tutors/shared';
import {
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  Matches,
  MaxLength,
} from 'class-validator';

const limits = BLOG_CONTENT_LIMITS;

export class CreateBlogDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(limits.title)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(limits.slug)
  @Matches(BLOG_SLUG_PATTERN)
  slug?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(limits.content)
  content!: string;

  @IsOptional()
  @IsString()
  @MaxLength(limits.excerpt)
  excerpt?: string;

  @IsOptional()
  @IsUrl()
  coverImageUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(limits.seoTitle)
  seoTitle?: string;

  @IsOptional()
  @IsString()
  @MaxLength(limits.seoDescription)
  seoDescription?: string;

  @IsOptional()
  @IsUrl()
  ogImageUrl?: string;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  tagIds?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(limits.tagName, { each: true })
  tagNames?: string[];
}

export class RejectBlogDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(limits.rejectedReason)
  reason!: string;
}

export class CreateBlogCommentDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(limits.comment)
  content!: string;

  @IsOptional()
  @IsUUID('4')
  parentId?: string;
}
