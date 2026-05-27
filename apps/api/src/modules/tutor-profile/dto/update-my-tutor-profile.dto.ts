import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsString,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ECurrency, TUTOR_PROFILE_UPDATE_SECTION, type TutorProfileUpdateSection } from '@mezon-tutors/shared';
import { AvailabilitySlotDto } from './update-availability.dto';

class TutorLanguageBodyDto {
  @IsString()
  @IsNotEmpty()
  languageCode: string;

  @IsString()
  @IsNotEmpty()
  proficiency: string;
}

class UpdateGeneralSectionDto {
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @IsString()
  @IsNotEmpty()
  lastName: string;

  @IsString()
  @IsNotEmpty()
  country: string;

  @IsString()
  @IsNotEmpty()
  phone: string;

  @IsString()
  @IsNotEmpty()
  subject: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TutorLanguageBodyDto)
  languages: TutorLanguageBodyDto[];
}

class UpdateTutorInfoSectionDto {
  @IsString()
  headline: string;

  @IsString()
  motivate: string;

  @IsString()
  introduce: string;

  @IsString()
  videoUrl: string;
}

class TrialLessonPricesDto {
  @IsNumber()
  @Min(0)
  usd: number;

  @IsNumber()
  @Min(0)
  vnd: number;

  @IsNumber()
  @Min(0)
  php: number;
}

class UpdateScheduleSectionDto {
  @IsEnum(ECurrency)
  currency: ECurrency;

  @IsObject()
  @ValidateNested()
  @Type(() => TrialLessonPricesDto)
  prices: TrialLessonPricesDto;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AvailabilitySlotDto)
  availability: AvailabilitySlotDto[];
}

export class UpdateMyTutorProfileBodyDto {
  @IsEnum(TUTOR_PROFILE_UPDATE_SECTION)
  section: TutorProfileUpdateSection;

  @ValidateIf((o) => o.section === TUTOR_PROFILE_UPDATE_SECTION.GENERAL)
  @IsObject()
  @ValidateNested()
  @Type(() => UpdateGeneralSectionDto)
  general?: UpdateGeneralSectionDto;

  @ValidateIf((o) => o.section === TUTOR_PROFILE_UPDATE_SECTION.TUTOR_INFO)
  @IsObject()
  @ValidateNested()
  @Type(() => UpdateTutorInfoSectionDto)
  tutorInfo?: UpdateTutorInfoSectionDto;

  @ValidateIf((o) => o.section === TUTOR_PROFILE_UPDATE_SECTION.SCHEDULE)
  @IsObject()
  @ValidateNested()
  @Type(() => UpdateScheduleSectionDto)
  schedule?: UpdateScheduleSectionDto;
}
