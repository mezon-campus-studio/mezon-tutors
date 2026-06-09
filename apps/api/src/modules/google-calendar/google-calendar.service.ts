import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import type { GoogleCalendarConnectionStatus } from '@mezon-tutors/shared';
import type { GoogleCalendarConnection } from '@mezon-tutors/db';
import { PrismaService } from '../../prisma/prisma.service';
import { AppConfigService } from '../../shared/services/app-config.service';

const OAUTH_STATE_TTL_MS = 1000 * 60 * 5;
const TOKEN_REFRESH_BUFFER_MS = 60_000;
const DEFAULT_CALENDAR_ID = 'primary';
const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v2/userinfo';
const GOOGLE_CALENDAR_SCOPES = [
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/userinfo.email',
].join(' ');

type PendingOAuthState = {
  userId: string;
  expiresAt: number;
};

type GoogleTokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
  scope?: string;
};

type GoogleUserInfo = {
  email?: string;
};

@Injectable()
export class GoogleCalendarService {
  private readonly logger = new Logger(GoogleCalendarService.name);
  private readonly pendingOAuthStates = new Map<string, PendingOAuthState>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly appConfig: AppConfigService,
  ) {}

  private assertConfigured() {
    if (!this.appConfig.isGoogleCalendarConfigured()) {
      throw new InternalServerErrorException(
        'Google Calendar OAuth is not configured (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET)',
      );
    }
  }

  private generateState(length = 32): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let state = '';
    while (state.length < length) {
      const byte = randomBytes(1)[0];
      state += chars[byte % chars.length];
    }
    return state;
  }

  private getOAuthStateHash(state: string): string {
    return createHash('sha256').update(state).digest('hex');
  }

  private pruneExpiredOAuthStates() {
    const now = Date.now();
    for (const [key, value] of this.pendingOAuthStates.entries()) {
      if (value.expiresAt <= now) {
        this.pendingOAuthStates.delete(key);
      }
    }
  }

  private isAccessTokenExpiringSoon(tokenExpiresAt: Date | null): boolean {
    if (!tokenExpiresAt) {
      return false;
    }
    return tokenExpiresAt.getTime() <= Date.now() + TOKEN_REFRESH_BUFFER_MS;
  }

  private resolveTokenExpiresAt(expiresIn?: number): Date | null {
    return typeof expiresIn === 'number'
      ? new Date(Date.now() + expiresIn * 1000)
      : null;
  }

  registerPendingOAuthState(state: string, userId: string): void {
    const key = this.getOAuthStateHash(state);
    this.pendingOAuthStates.set(key, {
      userId,
      expiresAt: Date.now() + OAUTH_STATE_TTL_MS,
    });
    if (this.pendingOAuthStates.size > 500) {
      this.pruneExpiredOAuthStates();
    }
  }

  consumePendingOAuthState(state: string): string | null {
    const key = this.getOAuthStateHash(state);
    const pending = this.pendingOAuthStates.get(key);
    if (!pending) {
      return null;
    }
    this.pendingOAuthStates.delete(key);
    if (pending.expiresAt <= Date.now()) {
      return null;
    }
    return pending.userId;
  }

  buildAuthorizeUrl(userId: string): { url: string; state: string } {
    this.assertConfigured();
    const { clientId, callbackUrl } = this.appConfig.googleCalendarOAuthConfig;
    const state = this.generateState();
    this.registerPendingOAuthState(state, userId);

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: callbackUrl,
      response_type: 'code',
      scope: GOOGLE_CALENDAR_SCOPES,
      access_type: 'offline',
      prompt: 'consent',
      state,
    });

    return {
      url: `${GOOGLE_AUTH_URL}?${params.toString()}`,
      state,
    };
  }

  private async exchangeAuthorizationCode(code: string): Promise<GoogleTokenResponse> {
    const { clientId, clientSecret, callbackUrl } = this.appConfig.googleCalendarOAuthConfig;
    const body = new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: callbackUrl,
      grant_type: 'authorization_code',
    });

    const response = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new BadRequestException(`Google token exchange failed: ${errorBody}`);
    }

    return (await response.json()) as GoogleTokenResponse;
  }

  private async fetchGoogleEmail(accessToken: string): Promise<string> {
    const response = await fetch(GOOGLE_USERINFO_URL, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      throw new BadRequestException('Could not fetch Google account email');
    }

    const userInfo = (await response.json()) as GoogleUserInfo;
    const email = userInfo.email?.trim();
    if (!email) {
      throw new BadRequestException('Google account email is missing');
    }
    return email;
  }

  private async invalidateConnection(userId: string, reason: string) {
    this.logger.warn(`Invalidating Google Calendar connection for user ${userId}: ${reason}`);
    await this.disconnect(userId);
  }

  private async performTokenRefresh(
    userId: string,
    connection: GoogleCalendarConnection,
  ): Promise<string> {
    this.assertConfigured();

    if (!connection.refreshToken) {
      await this.invalidateConnection(userId, 'missing refresh token');
      throw new UnauthorizedException('Google Calendar connection expired. Please reconnect.');
    }

    const { clientId, clientSecret } = this.appConfig.googleCalendarOAuthConfig;
    const body = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: connection.refreshToken,
      grant_type: 'refresh_token',
    });

    const response = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      await this.invalidateConnection(userId, `refresh failed: ${errorBody}`);
      throw new UnauthorizedException('Google Calendar connection expired. Please reconnect.');
    }

    const tokenResponse = (await response.json()) as GoogleTokenResponse;
    const tokenExpiresAt = this.resolveTokenExpiresAt(tokenResponse.expires_in);

    await this.prisma.googleCalendarConnection.update({
      where: { userId },
      data: {
        accessToken: tokenResponse.access_token,
        tokenExpiresAt,
        ...(tokenResponse.refresh_token ? { refreshToken: tokenResponse.refresh_token } : {}),
      },
    });

    return tokenResponse.access_token;
  }

  async getValidAccessToken(userId: string): Promise<string> {
    const connection = await this.prisma.googleCalendarConnection.findUnique({
      where: { userId },
    });

    if (!connection) {
      throw new UnauthorizedException('Google Calendar is not connected.');
    }

    if (!this.isAccessTokenExpiringSoon(connection.tokenExpiresAt)) {
      return connection.accessToken;
    }

    return this.performTokenRefresh(userId, connection);
  }

  async refreshAccessTokenIfNeeded(userId: string): Promise<string | null> {
    try {
      return await this.getValidAccessToken(userId);
    } catch {
      return null;
    }
  }

  async handleOAuthCallback(code: string, state: string, userId: string) {
    const tokenResponse = await this.exchangeAuthorizationCode(code);
    const googleEmail = await this.fetchGoogleEmail(tokenResponse.access_token);
    const tokenExpiresAt = this.resolveTokenExpiresAt(tokenResponse.expires_in);

    await this.prisma.googleCalendarConnection.upsert({
      where: { userId },
      create: {
        userId,
        googleEmail,
        accessToken: tokenResponse.access_token,
        refreshToken: tokenResponse.refresh_token ?? null,
        tokenExpiresAt,
        calendarId: DEFAULT_CALENDAR_ID,
        lastSyncedAt: new Date(),
      },
      update: {
        googleEmail,
        accessToken: tokenResponse.access_token,
        ...(tokenResponse.refresh_token ? { refreshToken: tokenResponse.refresh_token } : {}),
        tokenExpiresAt,
        calendarId: DEFAULT_CALENDAR_ID,
        lastSyncedAt: new Date(),
      },
    });

    return { googleEmail };
  }

  async getConnectionStatus(userId: string): Promise<GoogleCalendarConnectionStatus> {
    const connection = await this.prisma.googleCalendarConnection.findUnique({
      where: { userId },
      select: {
        googleEmail: true,
        lastSyncedAt: true,
      },
    });

    if (!connection) {
      return {
        connected: false,
        googleEmail: null,
        lastSyncedAt: null,
        needsReconnect: false,
      };
    }

    const previousEmail = connection.googleEmail;
    const previousLastSyncedAt = connection.lastSyncedAt?.toISOString() ?? null;

    try {
      await this.getValidAccessToken(userId);

      const refreshed = await this.prisma.googleCalendarConnection.findUnique({
        where: { userId },
        select: {
          googleEmail: true,
          lastSyncedAt: true,
        },
      });

      return {
        connected: true,
        googleEmail: refreshed?.googleEmail ?? previousEmail,
        lastSyncedAt: refreshed?.lastSyncedAt?.toISOString() ?? previousLastSyncedAt,
        needsReconnect: false,
      };
    } catch {
      return {
        connected: false,
        googleEmail: previousEmail,
        lastSyncedAt: previousLastSyncedAt,
        needsReconnect: true,
      };
    }
  }

  async disconnect(userId: string): Promise<void> {
    await this.prisma.googleCalendarConnection.deleteMany({
      where: { userId },
    });
  }
}
