import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
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

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    private readonly appConfig: AppConfigService,
    private readonly userService: UserService,
    private readonly notificationService: NotificationService
  ) {}

  buildMezonAuthorizeUrl(): { url: string; state: string } {
    const oauth = this.appConfig.oauthConfig;
    const state = crypto.randomUUID();
    const params = new URLSearchParams({
      client_id: oauth.clientId,
      redirect_uri: oauth.redirectUri,
      response_type: 'code',
      scope: 'openid offline',
      state,
    });

    return { url: `${oauth.baseUri}/oauth2/auth?${params.toString()}`, state };
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

    return data;
  }

  async fetchMezonUserInfo(accessToken: string): Promise<MezonUserInfo> {
    const oauth = this.appConfig.oauthConfig;

    const response = await fetch(`${oauth.baseUri}/userinfo`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        access_token: encodeURIComponent(accessToken),
        client_id: oauth.clientId,
        client_secret: oauth.clientSecret,
        redirect_uri: oauth.redirectUri,
      }),
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

  async syncProfileFromMezonWithCode(userId: string, code: string, state?: string, timezone?: string) {
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
        email: mezonUser.email,
        ...((!user.timezone || user.timezone === 'UTC') && timezone ? { timezone } : {}),
      },
    });

    const tokens = await this.generateTokens(updated);

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

  async createRefreshToken(userId: string): Promise<string> {
    const jwtConfig = this.appConfig.jwtConfig;
    const expiresIn = REFRESH_TOKEN_EXPIRES_IN;

    const token = await this.jwtService.signAsync(
      { sub: userId, type: 'refresh' },
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

  async validateRefreshToken(token: string): Promise<User | null> {
    const jwtConfig = this.appConfig.jwtConfig;

    try {
      const payload = await this.jwtService.verifyAsync(token, {
        secret: jwtConfig.refreshSecret,
      });

      if (payload.type !== 'refresh') {
        return null;
      }

      const refreshTokenRecord = await this.prisma.refreshToken.findFirst({
        where: {
          token,
          revokedAt: null,
          expiresAt: { gt: new Date() },
        },
      });

      if (!refreshTokenRecord) {
        return null;
      }

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
      });

      return user;
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

    const user = await this.validateRefreshToken(refreshToken);

    if (!user) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    await this.revokeRefreshToken(refreshToken);

    const payload: AuthUserPayload = {
      sub: user.id,
      mezonUserId: user.mezonUserId,
      username: user.username,
      role: user.role,
      avatar: user.avatar,
      email: user.email,
    };

    const accessToken = await this.jwtService.signAsync(payload, {
      expiresIn: ACCESS_TOKEN_EXPIRES_IN,
    });

    const newRefreshToken = await this.createRefreshToken(user.id);

    return {
      accessToken,
      refreshToken: newRefreshToken,
    };
  }

  async generateTokens(user: User): Promise<AuthTokens> {
    const jwtConfig = this.appConfig.jwtConfig;
    const payload: AuthUserPayload = {
      sub: user.id,
      mezonUserId: user.mezonUserId,
      username: user.username,
      role: user.role,
      avatar: user.avatar,
      email: user.email,
    };

    const accessToken = await this.jwtService.signAsync(payload, {
      expiresIn: ACCESS_TOKEN_EXPIRES_IN,
    });

    const refreshToken = await this.createRefreshToken(user.id);

    return {
      accessToken,
      refreshToken,
    };
  }

  async getCurrentUserForMe(userId: string) {
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
    };
  }

  async handleMezonCallback(code: string, state?: string, timezone?: string) {
    const tokenData = await this.exchangeCodeForToken(code, state);
    const mezonUser = await this.fetchMezonUserInfo(tokenData.access_token);
    const { user, created } = await this.findOrCreateUserFromMezon(mezonUser, timezone);
    const tokens = await this.generateTokens(user);

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
