import { APP_SETTINGS_LIMITS, type MezonLinks, type SocialLinks } from '@mezon-tutors/shared';
import { Type } from 'class-transformer';
import { IsInt, IsNumber, IsObject, IsOptional, Max, Min } from 'class-validator';

const limits = APP_SETTINGS_LIMITS;

export class UpdateAppSettingsDto {
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(limits.platformFeePercentage.min)
  @Max(limits.platformFeePercentage.max)
  platformFeePercentage!: number;

  @Type(() => Number)
  @IsInt()
  @Min(limits.settlementPeriodHours.min)
  @Max(limits.settlementPeriodHours.max)
  settlementPeriodHours!: number;

  @Type(() => Number)
  @IsInt()
  @Min(limits.disputePeriodHours.min)
  @Max(limits.disputePeriodHours.max)
  disputePeriodHours!: number;

  @Type(() => Number)
  @IsInt()
  @Min(limits.lessonChangePeriodHours.min)
  @Max(limits.lessonChangePeriodHours.max)
  lessonChangePeriodHours!: number;

  @Type(() => Number)
  @IsInt()
  @Min(limits.minWithdrawalAmountVnd.min)
  @Max(limits.minWithdrawalAmountVnd.max)
  minWithdrawalAmountVnd!: number;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 6 })
  @Min(limits.minWithdrawalAmountUsd.min)
  @Max(limits.minWithdrawalAmountUsd.max)
  minWithdrawalAmountUsd!: number;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 6 })
  @Min(limits.minWithdrawalAmountPhp.min)
  @Max(limits.minWithdrawalAmountPhp.max)
  minWithdrawalAmountPhp!: number;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(limits.subscriptionGroupDiscountRate.min)
  @Max(limits.subscriptionGroupDiscountRate.max)
  subscriptionGroupDiscountRate!: number;

  @IsOptional()
  @IsObject()
  mezonLinks?: MezonLinks | null;

  @IsOptional()
  @IsObject()
  socialLinks?: SocialLinks | null;
}
