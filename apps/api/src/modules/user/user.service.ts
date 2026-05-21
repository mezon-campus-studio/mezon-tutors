import { Injectable } from '@nestjs/common';
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
    email: string;
    timezone?: string;
  }): Promise<{ user: User; created: boolean }> {
    const { mezonUserId, username, avatar, email, timezone } = params;

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
          email,
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
        email,
        timezone: timezone ?? 'UTC',
      },
    });
    return { user, created: true };
  }
}
