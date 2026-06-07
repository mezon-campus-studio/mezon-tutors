import { EVENT_CONTENT_LIMITS } from '@mezon-tutors/shared';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  ValidateNested,
} from 'class-validator';

const limits = EVENT_CONTENT_LIMITS;

class EventLocaleContentDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(limits.title)
  title!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(limits.tagline)
  tagline!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(limits.theme)
  theme!: string;

  @IsOptional()
  @IsString()
  @MaxLength(limits.title)
  aboutTitle?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(limits.aboutBody)
  aboutBody!: string;

  @IsOptional()
  @IsString()
  @MaxLength(limits.aboutHighlight)
  aboutHighlight?: string;

  @IsOptional()
  @IsString()
  @MaxLength(limits.seoTitle)
  seoTitle?: string;

  @IsOptional()
  @IsString()
  @MaxLength(limits.seoDescription)
  seoDescription?: string;

  @IsOptional()
  @IsString()
  @MaxLength(limits.title)
  registerTitle?: string;

  @IsOptional()
  @IsString()
  @MaxLength(limits.aboutBody)
  registerDescription?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  priceLabel?: string;

  @IsOptional()
  @IsString()
  @MaxLength(limits.tagline)
  cardDescription?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  cardTag?: string;

  @IsOptional()
  @IsString()
  @MaxLength(240)
  marquee?: string;
}

class CreateEventOrganizerDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(limits.organizerName)
  name!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(limits.organizerRole)
  role!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(limits.organizerCategory)
  category!: string;

  @IsOptional()
  @IsString()
  @MaxLength(limits.organizerBio)
  bio?: string;

  @IsString()
  @IsNotEmpty()
  imageUrl!: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  gradient?: string;
}

class CreateEventGalleryImageDto {
  @IsString()
  @IsNotEmpty()
  imageUrl!: string;

  @IsOptional()
  @IsString()
  @MaxLength(limits.galleryCaption)
  captionVi?: string;

  @IsOptional()
  @IsString()
  @MaxLength(limits.galleryCaption)
  captionEn?: string;
}

class CreateEventStatDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(limits.statValue)
  value!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(limits.statLabel)
  labelVi!: string;

  @IsOptional()
  @IsString()
  @MaxLength(limits.statLabel)
  labelEn?: string;
}

export class CreateEventDto {
  @IsOptional()
  @IsString()
  @MaxLength(limits.slug)
  slug?: string;

  @IsDateString()
  startAt!: string;

  @IsOptional()
  @IsDateString()
  endAt?: string;

  @IsOptional()
  @IsDateString()
  doorsOpenAt?: string;

  @IsBoolean()
  isOnline!: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  city?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  country?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  venue?: string;

  @IsUrl()
  registrationUrl!: string;

  @IsString()
  @IsNotEmpty()
  coverImageUrl!: string;

  @IsString()
  @IsNotEmpty()
  ogImageUrl!: string;

  @ValidateNested()
  @Type(() => EventLocaleContentDto)
  contentVi!: EventLocaleContentDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => EventLocaleContentDto)
  contentEn?: EventLocaleContentDto;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(12)
  @ValidateNested({ each: true })
  @Type(() => CreateEventOrganizerDto)
  organizers!: CreateEventOrganizerDto[];

  @IsArray()
  @ArrayMaxSize(12)
  @ValidateNested({ each: true })
  @Type(() => CreateEventGalleryImageDto)
  galleryImages!: CreateEventGalleryImageDto[];

  @IsArray()
  @ArrayMaxSize(8)
  @ValidateNested({ each: true })
  @Type(() => CreateEventStatDto)
  stats!: CreateEventStatDto[];
}
