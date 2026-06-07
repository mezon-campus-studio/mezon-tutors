import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomBytes } from 'node:crypto';
import type { User } from '@mezon-tutors/db';
import { PrismaService } from '../../prisma/prisma.service';
import { AppConfigService } from '../../shared/services/app-config.service';
import type {
  AuthTokens,
  AuthUserPayload,
  MezonTokenResponse,
  MezonUserInfo,
} from './interfaces/auth.interfaces';
import { UserService } from '../user/user.service';
import { NotificationService } from '../notification/notification.service';

const ACCESS_TOKEN_EXPIRES_IN = '60m';
const REFRESH_TOKEN_EXPIRES_IN = '30d';
const OAUTH_STATE_TTL_MS = 1000 * 60 * 5;

@Injectable()
export class AuthService {
  private readonly pendingOAuthStates = new Map<string, number>();

  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    private readonly appConfig: AppConfigService,
    private readonly userService: UserService,
    private readonly notificationService: NotificationService
  ) {}

  buildMezonAuthorizeUrl(): { url: string; state: string } {
    const oauth = this.appConfig.oauthConfig;
    if (!oauth.clientId?.trim() || !oauth.clientSecret?.trim() || !oauth.redirectUri?.trim()) {
      throw new InternalServerErrorException(
        'Mezon OAuth config missing (client_id, client_secret, redirect_uri)'
      );
    }

    const state = this.generateAlphaNumericState(11);
    this.registerPendingOAuthState(state);

    const params = new URLSearchParams({
      client_id: oauth.clientId,
      redirect_uri: oauth.redirectUri,
      response_type: 'code',
      scope: 'openid offline',
      state,
    });

    return { url: `${oauth.baseUri}/oauth2/auth?${params.toString()}`, state };
  }

  private generateAlphaNumericState(length: number): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let state = '';
    while (state.length < length) {
      const byte = randomBytes(1)[0];
      state += chars[byte % chars.length];
    }
    return state;
  }

  registerPendingOAuthState(state: string): void {
    const key = this.getOAuthStateHash(state);
    this.pendingOAuthStates.set(key, Date.now() + OAUTH_STATE_TTL_MS);
    if (this.pendingOAuthStates.size > 500) {
      this.pruneExpiredOAuthStates();
    }
  }

  isValidPendingOAuthState(state: string): boolean {
    const key = this.getOAuthStateHash(state);
    const expiresAt = this.pendingOAuthStates.get(key);
    if (!expiresAt) {
      return false;
    }
    if (Date.now() > expiresAt) {
      this.pendingOAuthStates.delete(key);
      return false;
    }
    return true;
  }

  consumePendingOAuthState(state: string): boolean {
    const key = this.getOAuthStateHash(state);
    if (!this.isValidPendingOAuthState(state)) {
      return false;
    }
    this.pendingOAuthStates.delete(key);
    return true;
  }

  private getOAuthStateHash(state: string): string {
    return createHash('sha256').update(state).digest('hex');
  }

  private pruneExpiredOAuthStates(): void {
    const now = Date.now();
    for (const [state, expiresAt] of this.pendingOAuthStates) {
      if (now > expiresAt) {
        this.pendingOAuthStates.delete(state);
      }
    }
  }

  async exchangeCodeForToken(code: string, state?: string): Promise<MezonTokenResponse> {
    const oauth = this.appConfig.oauthConfig;

    const response = await fetch(`${oauth.baseUri}/oauth2/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        ...(state ? { state } : {}),
        client_id: oauth.clientId,
        client_secret: oauth.clientSecret,
        redirect_uri: oauth.redirectUri,
        scope: 'openid offline',
      }),
    });

    if (!response.ok) {
      throw new UnauthorizedException('Failed to exchange authorization code with Mezon');
    }

    const data = (await response.json()) as MezonTokenResponse;
    if (!data.access_token) {
      throw new UnauthorizedException('Mezon token response is missing access_token');
    }

    if (!data.id_token) {
      throw new UnauthorizedException('Mezon token response is missing id_token');
    }

    return data;
  }

  async fetchMezonUserInfo(accessToken: string): Promise<MezonUserInfo> {
    const oauth = this.appConfig.oauthConfig;

    const response = await fetch(`${oauth.baseUri}/userinfo`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new UnauthorizedException('Failed to fetch user info from Mezon');
    }

    const data = (await response.json()) as MezonUserInfo;

    if (!data.username) {
      throw new BadRequestException('Mezon user info does not contain an username');
    }

    return {
      ...data,
      avatar: data.avatar ?? null,
    };
  }

  async syncProfileFromMezonWithCode(
    userId: string,
    code: string,
    state?: string,
    timezone?: string
  ) {
    const tokenData = await this.exchangeCodeForToken(code, state);
    const mezonUser = await this.fetchMezonUserInfo(tokenData.access_token);

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (user.mezonUserId !== mezonUser.user_id) {
      throw new ForbiddenException('Mezon account does not match the signed-in user');
    }

    const username = mezonUser.username || user.username;

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        username,
        avatar: mezonUser.avatar ?? '',
        ...(mezonUser.email?.trim() ? { email: mezonUser.email.trim() } : {}),
        ...((!user.timezone || user.timezone === 'UTC') && timezone ? { timezone } : {}),
      },
    });

    const tokens = await this.generateTokens(updated, tokenData.id_token);

    return {
      user: {
        id: updated.id,
        mezonUserId: updated.mezonUserId,
        username: updated.username,
        role: updated.role,
        avatar: updated.avatar,
        email: mezonUser.email ?? null,
        timezone: updated.timezone ?? null,
      },
      tokens,
      idToken: tokenData.id_token ?? null,
    };
  }

  async findOrCreateUserFromMezon(
    mezonUser: MezonUserInfo,
    timezone?: string
  ): Promise<{ user: User; created: boolean }> {
    const mezonUserId = mezonUser.user_id;
    const username = mezonUser.username || `user-${mezonUserId.substring(0, 8)}`;

    return this.userService.upsertFromMezon({
      mezonUserId,
      username,
      avatar: mezonUser.avatar,
      email: mezonUser.email,
      timezone,
    });
  }

  async createRefreshToken(userId: string, idToken?: string | null): Promise<string> {
    const jwtConfig = this.appConfig.jwtConfig;
    const expiresIn = REFRESH_TOKEN_EXPIRES_IN;

    const token = await this.jwtService.signAsync(
      { sub: userId, type: 'refresh', ...(idToken ? { idToken } : {}) },
      {
        expiresIn,
        secret: jwtConfig.refreshSecret,
      }
    );

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    await this.prisma.refreshToken.create({
      data: {
        userId,
        token,
        expiresAt,
      },
    });

    return token;
  }

  async validateRefreshToken(token: string): Promise<{ user: User; idToken?: string } | null> {
    const jwtConfig = this.appConfig.jwtConfig;

    try {
      const payload = await this.jwtService.verifyAsync<{
        sub: string;
        type: string;
        idToken?: string;
      }>(token, {
        secret: jwtConfig.refreshSecret,
      });

      if (payload.type !== 'refresh') {
        return null;
      }

      const now = new Date();
      const refreshTokenRecord = await this.prisma.refreshToken.findFirst({
        where: {
          token,
          expiresAt: { gt: now },
          OR: [
            { revokedAt: null },
            { revokedAt: { gte: new Date(now.getTime() - 15_000) } },
          ],
        },
      });

      if (!refreshTokenRecord) {
        return null;
      }

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
      });

      if (!user) {
        return null;
      }

      const idToken =
        typeof payload.idToken === 'string' && payload.idToken.trim() ? payload.idToken : undefined;

      return { user, idToken };
    } catch {
      return null;
    }
  }

  async revokeRefreshToken(token: string): Promise<void> {
    try {
      await this.prisma.refreshToken.updateMany({
        where: {
          token,
          revokedAt: null,
        },
        data: {
          revokedAt: new Date(),
        },
      });
    } catch {}
  }

  async refreshAccessToken(refreshToken: string | undefined): Promise<AuthTokens> {
    if (!refreshToken?.trim()) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const validated = await this.validateRefreshToken(refreshToken);

    if (!validated) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const { user, idToken } = validated;

    await this.revokeRefreshToken(refreshToken);

    const accessPayload: AuthUserPayload = {
      sub: user.id,
      mezonUserId: user.mezonUserId,
      username: user.username,
      role: user.role,
      avatar: user.avatar,
      email: user.email,
      ...(idToken ? { idToken } : {}),
    };

    const accessToken = await this.jwtService.signAsync(accessPayload, {
      expiresIn: ACCESS_TOKEN_EXPIRES_IN,
    });

    const newRefreshToken = await this.createRefreshToken(user.id, idToken);

    return {
      accessToken,
      refreshToken: newRefreshToken,
    };
  }

  async generateTokens(user: User, idToken?: string | null): Promise<AuthTokens> {
    const mezonIdToken = typeof idToken === 'string' && idToken.trim() ? idToken : undefined;
    const payload: AuthUserPayload = {
      sub: user.id,
      mezonUserId: user.mezonUserId,
      username: user.username,
      role: user.role,
      avatar: user.avatar,
      email: user.email,
      ...(mezonIdToken ? { idToken: mezonIdToken } : {}),
    };

    const accessToken = await this.jwtService.signAsync(payload, {
      expiresIn: ACCESS_TOKEN_EXPIRES_IN,
    });

    const refreshToken = await this.createRefreshToken(user.id, mezonIdToken);

    return {
      accessToken,
      refreshToken,
    };
  }

  async getCurrentUserForMe(userId: string, idToken?: string | null) {
    const user = await this.userService.findById(userId);
    if (!user) {
      throw new UnauthorizedException();
    }
    return {
      sub: user.id,
      id: user.id,
      mezonUserId: user.mezonUserId,
      username: user.username,
      role: user.role,
      avatar: user.avatar || null,
      email: user.email ?? null,
      timezone: user.timezone ?? null,
      idToken: idToken ?? null,
    };
  }

  async handleMezonCallback(code: string, state?: string, timezone?: string) {
    const tokenData = await this.exchangeCodeForToken(code, state);
    const mezonUser = await this.fetchMezonUserInfo(tokenData.access_token);
    const { user, created } = await this.findOrCreateUserFromMezon(mezonUser, timezone);
    const tokens = await this.generateTokens(user, tokenData.id_token);

    if (created) {
      void this.notificationService.notifyWelcomeLinked({
        userId: user.id,
        mezonUserId: user.mezonUserId,
        displayName: user.username,
      });
    }

    const result = {
      user: {
        id: user.id,
        mezonUserId: user.mezonUserId,
        username: user.username,
        role: user.role,
        avatar: user.avatar,
        email: mezonUser.email ?? null,
        timezone: user.timezone ?? null,
      },
      tokens,
      idToken: tokenData.id_token ?? null,
    };

    return {
      ...result,
    };
  }
}
