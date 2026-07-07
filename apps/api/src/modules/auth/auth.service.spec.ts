import { describe, it, expect, beforeEach } from 'vitest';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';

type RTRecord = {
  id: string;
  userId: string;
  token: string;
  expiresAt: Date;
  revokedAt: Date | null;
};

function makeFakePrisma() {
  const tokens: RTRecord[] = [];
  const users = new Map<string, unknown>();
  let seq = 0;

  const matches = (r: RTRecord, where: any): boolean => {
    if (where.token !== undefined && r.token !== where.token) return false;
    if (where.expiresAt?.gt !== undefined && !(r.expiresAt > where.expiresAt.gt)) return false;
    if (where.revokedAt === null && r.revokedAt !== null) return false;
    if (where.OR) {
      const ok = where.OR.some((clause: any) => {
        if (clause.revokedAt === null) return r.revokedAt === null;
        if (clause.revokedAt?.gte !== undefined) {
          return r.revokedAt !== null && r.revokedAt >= clause.revokedAt.gte;
        }
        return false;
      });
      if (!ok) return false;
    }
    return true;
  };

  const refreshToken = {
    async create({ data }: any): Promise<RTRecord> {
      const rec: RTRecord = {
        id: `rt-${seq++}`,
        userId: data.userId,
        token: data.token,
        expiresAt: data.expiresAt,
        revokedAt: null,
      };
      tokens.push(rec);
      return rec;
    },
    async findFirst({ where }: any): Promise<RTRecord | null> {
      return tokens.find((r) => matches(r, where)) ?? null;
    },
    async updateMany({ where, data }: any): Promise<{ count: number }> {
      let count = 0;
      for (const r of tokens) {
        if (matches(r, where)) {
          if (data.revokedAt !== undefined) r.revokedAt = data.revokedAt;
          count++;
        }
      }
      return { count };
    },
  };

  const client = {
    refreshToken,
    user: {
      async findUnique({ where }: any) {
        return users.get(where.id) ?? null;
      },
    },
    async $transaction<T>(cb: (tx: typeof client) => Promise<T>): Promise<T> {
      return cb(client);
    },
  };

  return { client, users };
}

function makeAuthService() {
  const { client, users } = makeFakePrisma();
  const jwt = new JwtService({ secret: 'access-secret', signOptions: { expiresIn: '15m' } });
  const appConfig = {
    jwtConfig: { secret: 'access-secret', refreshSecret: 'refresh-secret' },
  };
  const user = {
    id: 'user-1',
    mezonUserId: 'mezon-1',
    username: 'alice',
    role: 'STUDENT',
    avatar: null,
    email: null,
  };
  users.set('user-1', user);

  const svc = new AuthService(
    jwt as any,
    client as any,
    appConfig as any,
    {} as any, // userService (unused by refresh path)
    {} as any, // notificationService (unused by refresh path)
  );
  return { svc, user };
}

describe('AuthService.refreshAccessToken — concurrency', () => {
  let svc: AuthService;

  beforeEach(() => {
    ({ svc } = makeAuthService());
  });

  it('rotates the refresh token on a normal refresh', async () => {
    const rt1 = await svc.createRefreshToken('user-1');
    const result = await svc.refreshAccessToken(rt1);

    expect(result.accessToken).toBeTruthy();
    expect(result.refreshToken).toBeTruthy();
    expect(result.refreshToken).not.toBe(rt1);
  });

  it('does NOT log out the second concurrent refresh of the same token (grace replay)', async () => {
    const rt1 = await svc.createRefreshToken('user-1');

    // Winner rotates RT1 -> RT2.
    const winner = await svc.refreshAccessToken(rt1);
    expect(winner.refreshToken).toBeTruthy();

    // Loser: a concurrent request that still holds RT1 (revoked < 15s ago).
    // It must still receive a usable access token instead of being thrown out,
    // and must NOT re-rotate (refreshToken omitted => controller keeps winner's cookie).
    const loser = await svc.refreshAccessToken(rt1);
    expect(loser.accessToken).toBeTruthy();
    expect(loser.refreshToken).toBeUndefined();
  });

  it('still rejects reuse of a token revoked OUTSIDE the grace window (theft detection)', async () => {
    const rt1 = await svc.createRefreshToken('user-1');
    await svc.refreshAccessToken(rt1); // revokes RT1 (revokedAt = now)

    // Age RT1's revocation to well outside the 15s grace window.
    const prisma = (svc as unknown as { prisma: any }).prisma;
    const rec = await prisma.refreshToken.findFirst({ where: { token: rt1 } });
    rec.revokedAt = new Date(Date.now() - 60_000);

    await expect(svc.refreshAccessToken(rt1)).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
