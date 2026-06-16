import { Injectable, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import type { SupportAdminContact } from '@mezon-tutors/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { AppConfigService } from '../../shared/services/app-config.service';

const supportAdminSelect = {
  id: true,
  username: true,
  avatar: true,
  mezonUserId: true,
  tutorProfile: {
    select: {
      firstName: true,
      lastName: true,
    },
  },
} as const;

@Injectable()
export class SupportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly appConfig: AppConfigService,
  ) {}

  async getAdminContact(): Promise<SupportAdminContact> {
    const adminMezonId = this.appConfig.adminMezonId;
    if (adminMezonId) {
      const byMezon = await this.prisma.user.findFirst({
        where: { mezonUserId: adminMezonId },
        select: supportAdminSelect,
      });
      const contact = byMezon ? this.toContact(byMezon) : null;
      if (contact) {
        return contact;
      }
    }

    const fallbackAdmin = await this.prisma.user.findFirst({
      where: { role: Role.ADMIN },
      orderBy: { createdAt: 'asc' },
      select: supportAdminSelect,
    });

    const contact = fallbackAdmin ? this.toContact(fallbackAdmin) : null;
    if (!contact) {
      throw new NotFoundException(
        'Support admin is not configured. Set ADMIN_MEZON_ID to a Mezon user linked in the app, or ensure an ADMIN account has a Mezon ID.',
      );
    }

    return contact;
  }

  async getBotContact(): Promise<SupportAdminContact> {
    const botMezonId = this.appConfig.mezonBotConfig.botId;
    if (!botMezonId) {
      throw new NotFoundException('Mezon Bot ID is not configured.');
    }

    const botUser = await this.prisma.user.upsert({
      where: { mezonUserId: botMezonId },
      update: {
        username: 'mezonly_bot',
      },
      create: {
        mezonUserId: botMezonId,
        username: 'mezonly_bot',
        avatar: 'https://cdn.mezon.vn/1840668623337689088/2047567692088479744.png',
        role: Role.ADMIN,
      },
      select: supportAdminSelect,
    });

    const contact = this.toContact(botUser);
    if (!contact) {
      throw new NotFoundException('Could not resolve bot contact.');
    }

    return contact;
  }

  private toContact(user: {
    id: string;
    username: string;
    avatar: string;
    mezonUserId: string | null;
    tutorProfile: { firstName: string | null; lastName: string | null } | null;
  }): SupportAdminContact | null {
    if (!user.mezonUserId?.trim()) {
      return null;
    }

    const profileName = user.tutorProfile
      ? `${user.tutorProfile.firstName ?? ''} ${user.tutorProfile.lastName ?? ''}`.trim()
      : '';

    return {
      id: user.id,
      username: user.username,
      displayName: profileName || user.username || 'Support',
      avatar: user.avatar,
      mezonUserId: user.mezonUserId,
    };
  }
}
