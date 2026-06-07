import { ForbiddenException, Injectable } from '@nestjs/common';
import { Role, type User } from '@mezon-tutors/db';
import type { TrustShowcaseAvatarDto } from '@mezon-tutors/shared';
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

  async findRandomTrustShowcaseAvatars(limit: number): Promise<TrustShowcaseAvatarDto[]> {
    const safeLimit = Math.min(Math.max(Math.floor(limit), 1), 20);

    const where = {
      avatar: { not: { equals: '' } },
    } as const;

    const count = await this.prisma.user.count({ where });

    if (count === 0) {
      return [];
    }

    const poolSize = Math.min(RANDOM_POOL_MAX, count);
    const skip = Math.max(0, Math.floor(Math.random() * (count - poolSize + 1)));

    const rows = await this.prisma.user.findMany({
      where,
      select: { id: true, avatar: true },
      skip,
      take: poolSize,
      orderBy: { createdAt: 'desc' },
    });

    shuffleInPlace(rows);

    return rows.slice(0, safeLimit).map((u) => ({ id: u.id, url: u.avatar }));
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
