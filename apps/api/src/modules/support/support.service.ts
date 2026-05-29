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
