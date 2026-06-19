import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  type AppSettings,
  type MezonLinks,
  type SocialLinks,
  type PublicAppSettings,
  mezonLinksSchema,
  normalizeMezonLinksForStorage,
  socialLinksSchema,
  normalizeSocialLinksForStorage,
} from '@mezon-tutors/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateAppSettingsDto } from './dto/update-app-settings.dto';

const SETTINGS_ID = 'default';

const settingsInclude = {
  updatedBy: {
    select: { id: true, username: true },
  },
} as const;

@Injectable()
export class AppSettingsService {
  private cachedSettings: AppSettings | null = null;

  constructor(private readonly prisma: PrismaService) {}

  async getSettings(): Promise<AppSettings> {
    if (this.cachedSettings) {
      return this.cachedSettings;
    }

    const row = await this.ensureSettingsRow();
    this.cachedSettings = this.serialize(row);
    return this.cachedSettings;
  }

  async getPublicSettings(): Promise<PublicAppSettings> {
    const settings = await this.getSettings();
    return this.toPublicSettings(settings);
  }

  private async findSettingsWithUpdater() {
    return this.prisma.appSettings.findUnique({
      where: { id: SETTINGS_ID },
      include: settingsInclude,
    });
  }

  async updateSettings(
    adminUserId: string,
    dto: UpdateAppSettingsDto
  ): Promise<AppSettings> {
    const data = this.toPrismaUpdate(dto);
    await this.prisma.appSettings.upsert({
      where: { id: SETTINGS_ID },
      create: {
        id: SETTINGS_ID,
        ...(data as Prisma.AppSettingsUncheckedCreateInput),
        updatedByUserId: adminUserId,
      },
      update: {
        ...(data as Prisma.AppSettingsUncheckedUpdateInput),
        updatedByUserId: adminUserId,
      },
    });
    this.cachedSettings = null;
    const row = await this.findSettingsWithUpdater();
    if (!row) {
      throw new Error('App settings row missing after upsert');
    }
    this.cachedSettings = this.serialize(row);
    return this.cachedSettings;
  }

  private async ensureSettingsRow() {
    const existing = await this.findSettingsWithUpdater();
    if (existing) {
      return existing;
    }
    await this.prisma.appSettings.create({ data: { id: SETTINGS_ID } });
    const created = await this.findSettingsWithUpdater();
    if (!created) {
      throw new Error('App settings row missing after create');
    }
    return created;
  }

  private toPrismaUpdate(
    dto: UpdateAppSettingsDto
  ): Prisma.AppSettingsUncheckedUpdateInput {
    const data: Prisma.AppSettingsUncheckedUpdateInput = {};

    if (dto.platformFeePercentage !== undefined) {
      data.platformFeePercentage = new Prisma.Decimal(dto.platformFeePercentage);
    }
    if (dto.settlementPeriodHours !== undefined) {
      data.settlementPeriodHours = dto.settlementPeriodHours;
    }
    if (dto.disputePeriodHours !== undefined) {
      data.disputePeriodHours = dto.disputePeriodHours;
    }
    if (dto.lessonChangePeriodHours !== undefined) {
      data.lessonChangePeriodHours = dto.lessonChangePeriodHours;
    }
    if (dto.minWithdrawalAmountVnd !== undefined) {
      data.minWithdrawalAmountVnd = BigInt(dto.minWithdrawalAmountVnd);
    }
    if (dto.minWithdrawalAmountUsd !== undefined) {
      data.minWithdrawalAmountUsd = new Prisma.Decimal(dto.minWithdrawalAmountUsd);
    }
    if (dto.minWithdrawalAmountPhp !== undefined) {
      data.minWithdrawalAmountPhp = new Prisma.Decimal(dto.minWithdrawalAmountPhp);
    }
    if (dto.subscriptionGroupDiscountRate !== undefined) {
      data.subscriptionGroupDiscountRate = new Prisma.Decimal(
        dto.subscriptionGroupDiscountRate,
      );
    }
    if (dto.mezonLinks !== undefined) {
      data.mezonLinks = normalizeMezonLinksForStorage(
        dto.mezonLinks,
      ) as Prisma.InputJsonValue;
    }
    if (dto.socialLinks !== undefined) {
      data.socialLinks = normalizeSocialLinksForStorage(dto.socialLinks) as Prisma.InputJsonValue;
    }

    return data;
  }

  private parseMezonLinks(value: Prisma.JsonValue | null): MezonLinks | null {
    if (value === null || value === undefined) {
      return null;
    }

    const parsed = mezonLinksSchema.safeParse(value);
    if (!parsed.success) {
      return null;
    }

    return normalizeMezonLinksForStorage(parsed.data);
  }

  private parseSocialLinks(value: Prisma.JsonValue | null): SocialLinks | null {
    if (value === null || value === undefined) return null;

    const parsed = socialLinksSchema.safeParse(value);
    if (!parsed.success) return null;

    return normalizeSocialLinksForStorage(parsed.data);
  }

  private serialize(row: {
    id: string;
    platformFeePercentage: Prisma.Decimal;
    settlementPeriodHours: number;
    disputePeriodHours: number;
    lessonChangePeriodHours: number;
    minWithdrawalAmountVnd: bigint;
    minWithdrawalAmountUsd: Prisma.Decimal;
    minWithdrawalAmountPhp: Prisma.Decimal;
    subscriptionGroupDiscountRate: Prisma.Decimal;
    mezonLinks: Prisma.JsonValue | null;
    updatedByUserId: string | null;
    updatedAt: Date;
    updatedBy: { id: string; username: string } | null;
  }): AppSettings {
    return {
      id: row.id,
      platformFeePercentage: Number(row.platformFeePercentage),
      settlementPeriodHours: row.settlementPeriodHours,
      disputePeriodHours: row.disputePeriodHours,
      lessonChangePeriodHours: row.lessonChangePeriodHours,
      minWithdrawalAmountVnd: Number(row.minWithdrawalAmountVnd),
      minWithdrawalAmountUsd: Number(row.minWithdrawalAmountUsd),
      minWithdrawalAmountPhp: Number(row.minWithdrawalAmountPhp),
      subscriptionGroupDiscountRate: Number(row.subscriptionGroupDiscountRate),
      mezonLinks: this.parseMezonLinks(row.mezonLinks),
      socialLinks: this.parseSocialLinks((row as any).socialLinks ?? null),
      updatedByUserId: row.updatedByUserId,
      updatedBy: row.updatedBy,
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private toPublicSettings(settings: AppSettings): PublicAppSettings {
    return {
      platformFeePercentage: settings.platformFeePercentage,
      settlementPeriodHours: settings.settlementPeriodHours,
      disputePeriodHours: settings.disputePeriodHours,
      lessonChangePeriodHours: settings.lessonChangePeriodHours,
      minWithdrawalAmountVnd: settings.minWithdrawalAmountVnd,
      minWithdrawalAmountUsd: settings.minWithdrawalAmountUsd,
      minWithdrawalAmountPhp: settings.minWithdrawalAmountPhp,
      subscriptionGroupDiscountRate: settings.subscriptionGroupDiscountRate,
      mezonLinks: settings.mezonLinks,
      socialLinks: settings.socialLinks,
    };
  }
}
