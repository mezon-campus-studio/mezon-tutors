import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { Role, VerificationStatus, type User } from '@mezon-tutors/db';
import type { TrustShowcaseDto } from '@mezon-tutors/shared';
import { PrismaService } from '../../prisma/prisma.service';

const RANDOM_POOL_MAX = 150;

function shuffleInPlace<T>(items: T[]): void {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = items[i]!;
    items[i] = items[j]!;
    items[j] = tmp;
  }
}

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  findByMezonUserId(mezonUserId: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { mezonUserId },
    });
  }

  private assertValidIanaTimezone(timezone: string): void {
    try {
      Intl.DateTimeFormat('en-US', { timeZone: timezone }).format(new Date());
    } catch {
      throw new BadRequestException('Invalid timezone');
    }
  }

  async updateTimezone(userId: string, timezone: string): Promise<User> {
    const trimmed = timezone.trim();
    this.assertValidIanaTimezone(trimmed);

    return this.prisma.user.update({
      where: { id: userId },
      data: { timezone: trimmed },
    });
  }

  async findRoleById(userId: string): Promise<Role | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    return user?.role ?? null;
  }

  async assertUserHasRole(
    userId: string,
    expectedRole: Role,
    forbiddenMessage: string,
  ): Promise<void> {
    const role = await this.findRoleById(userId);
    if (!role) {
      throw new ForbiddenException('Unauthorized');
    }
    if (role !== expectedRole) {
      throw new ForbiddenException(forbiddenMessage);
    }
  }

  async findRandomTrustShowcaseAvatars(limit: number): Promise<TrustShowcaseDto> {
    const safeLimit = Math.min(Math.max(Math.floor(limit), 1), 20);

    const verifiedWhere = {
      verificationStatus: VerificationStatus.APPROVED,
    } as const;

    const avatarWhere = {
      ...verifiedWhere,
      avatar: { not: { equals: '' } },
    } as const;

    const [totalTutors, avatarCount] = await Promise.all([
      this.prisma.tutorProfile.count({ where: verifiedWhere }),
      this.prisma.tutorProfile.count({ where: avatarWhere }),
    ]);

    if (avatarCount === 0) {
      return { avatars: [], tutor: totalTutors };
    }

    const poolSize = Math.min(RANDOM_POOL_MAX, avatarCount);
    const skip = Math.max(0, Math.floor(Math.random() * (avatarCount - poolSize + 1)));

    const rows = await this.prisma.tutorProfile.findMany({
      where: avatarWhere,
      select: { id: true, avatar: true },
      skip,
      take: poolSize,
      orderBy: { createdAt: 'desc' },
    });

    shuffleInPlace(rows);

    return {
      avatars: rows.slice(0, safeLimit).map((tutor) => ({
        id: tutor.id,
        url: tutor.avatar,
      })),
      tutor: totalTutors,
    };
  }

  async upsertFromMezon(params: {
    mezonUserId: string;
    username: string;
    avatar?: string | null;
    email?: string | null;
    timezone?: string;
  }): Promise<{ user: User; created: boolean }> {
    const { mezonUserId, username, avatar, email, timezone } = params;
    const normalizedEmail = email?.trim() || undefined;

    const existing = await this.prisma.user.findUnique({
      where: { mezonUserId },
      select: { id: true, timezone: true },
    });

    if (existing) {
      const user = await this.prisma.user.update({
        where: { id: existing.id },
        data: {
          username,
          avatar: avatar ?? '',
          ...(normalizedEmail !== undefined ? { email: normalizedEmail } : {}),
          ...((!existing.timezone || existing.timezone === 'UTC') && timezone ? { timezone } : {}),
        },
      });
      return { user, created: false };
    }

    const user = await this.prisma.user.create({
      data: {
        mezonUserId,
        username,
        avatar: avatar ?? '',
        role: Role.STUDENT,
        ...(normalizedEmail !== undefined ? { email: normalizedEmail } : {}),
        timezone: timezone ?? 'UTC',
      },
    });

    await this.prisma.wallet.upsert({
      where: { userId: user.id },
      update: {},
      create: { userId: user.id },
    });

    return { user, created: true };
  }
}
