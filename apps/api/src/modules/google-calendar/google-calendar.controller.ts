import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { CookieOptions, Request, Response } from 'express';
import { Throttle } from '@nestjs/throttler';
import { AppConfigService } from '../../shared/services/app-config.service';
import { AuthService } from '../auth/auth.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthUserPayload } from '../auth/interfaces/auth.interfaces';
import { GoogleCalendarCallbackQueryDto } from './dto/google-calendar-callback-query.dto';
import { GoogleCalendarService } from './google-calendar.service';
import { GoogleCalendarSyncService } from './google-calendar-sync.service';

const GCAL_OAUTH_STATE_COOKIE = 'gcal_oauth_state';
const GCAL_OAUTH_RETURN_TO_COOKIE = 'gcal_oauth_return_to';
const GCAL_OAUTH_USER_COOKIE = 'gcal_oauth_user';
const OAUTH_STATE_MAX_AGE = 1000 * 60 * 5;

@Controller('google-calendar')
@ApiTags('Google Calendar')
@Throttle({ default: { ttl: 60000, limit: 40 } })
export class GoogleCalendarController {
  constructor(
    private readonly googleCalendarService: GoogleCalendarService,
    private readonly googleCalendarSyncService: GoogleCalendarSyncService,
    private readonly authService: AuthService,
    private readonly appConfig: AppConfigService,
  ) {}

  private getOAuthStateCookieOptions(): CookieOptions {
    return {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: OAUTH_STATE_MAX_AGE,
      path: '/',
      partitioned: true,
    };
  }

  private buildFrontendReturnUrl(path: string, params: Record<string, string>): string {
    const frontendBase = this.appConfig.frontendUrl.replace(/\/+$/, '');
    const url = new URL(`${frontendBase}${path}`);
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }
    return url.toString();
  }

  private clearOAuthCookies(res: Response) {
    const opts = this.getOAuthStateCookieOptions();
    const clearOpts = {
      path: opts.path ?? '/',
      httpOnly: opts.httpOnly,
      secure: opts.secure,
      sameSite: opts.sameSite,
    };
    for (const name of [
      GCAL_OAUTH_STATE_COOKIE,
      GCAL_OAUTH_RETURN_TO_COOKIE,
      GCAL_OAUTH_USER_COOKIE,
    ]) {
      res.clearCookie(name, clearOpts);
    }
  }

  private beginOAuthFlow(
    res: Response,
    userId: string,
    returnTo: string | undefined,
  ): string {
    const { url, state } = this.googleCalendarService.buildAuthorizeUrl(userId);
    const cookieOptions = this.getOAuthStateCookieOptions();
    res.cookie(GCAL_OAUTH_STATE_COOKIE, state, cookieOptions);
    res.cookie(GCAL_OAUTH_USER_COOKIE, userId, cookieOptions);
    if (returnTo?.trim()) {
      res.cookie(GCAL_OAUTH_RETURN_TO_COOKIE, returnTo.trim(), cookieOptions);
    }
    return url;
  }

  @UseGuards(JwtAuthGuard)
  @Get('oauth/authorize-url')
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @ApiOperation({ summary: 'Get Google Calendar OAuth URL (sets OAuth cookies)' })
  getOAuthAuthorizeUrl(
    @Query('returnTo') returnTo: string | undefined,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const user = req.user as AuthUserPayload;
    const url = this.beginOAuthFlow(res, user.sub, returnTo);
    return { url };
  }

  @Get('oauth/start')
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  async oauthStart(
    @Query('returnTo') returnTo: string | undefined,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const refreshToken = req.cookies?.refresh_token as string | undefined;
    const validated = await this.authService.validateRefreshToken(refreshToken ?? '');
    if (!validated) {
      throw new UnauthorizedException('Must be signed in to connect Google Calendar');
    }

    const url = this.beginOAuthFlow(res, validated.user.id, returnTo);
    return res.redirect(302, url);
  }

  @Get('oauth/callback')
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  async oauthCallback(
    @Query() query: GoogleCalendarCallbackQueryDto,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const cookieState = req.cookies?.[GCAL_OAUTH_STATE_COOKIE] as string | undefined;
    const cookieUserId = req.cookies?.[GCAL_OAUTH_USER_COOKIE] as string | undefined;
    const oauthReturnTo =
      (req.cookies?.[GCAL_OAUTH_RETURN_TO_COOKIE] as string | undefined) ||
      '/dashboard/settings?tab=google-calendar';

    this.clearOAuthCookies(res);

    if (query.error?.trim()) {
      return res.redirect(
        302,
        this.buildFrontendReturnUrl(oauthReturnTo, {
          gcal: 'error',
          reason: query.error.trim(),
        }),
      );
    }

    const { code, state } = query;
    if (!code?.trim() || !state?.trim()) {
      return res.redirect(
        302,
        this.buildFrontendReturnUrl(oauthReturnTo, {
          gcal: 'error',
          reason: 'missing_code',
        }),
      );
    }

    if (!cookieState || cookieState !== state || !cookieUserId) {
      return res.redirect(
        302,
        this.buildFrontendReturnUrl(oauthReturnTo, {
          gcal: 'error',
          reason: 'invalid_state',
        }),
      );
    }

    const userId = this.googleCalendarService.consumePendingOAuthState(state);
    if (!userId || userId !== cookieUserId) {
      return res.redirect(
        302,
        this.buildFrontendReturnUrl(oauthReturnTo, {
          gcal: 'error',
          reason: 'invalid_state',
        }),
      );
    }

    try {
      await this.googleCalendarService.handleOAuthCallback(code.trim(), state.trim(), userId);
      void this.googleCalendarSyncService.syncLessons(userId).catch(() => {
        console.error('Failed to sync lessons for user', userId);
      });
      return res.redirect(
        302,
        this.buildFrontendReturnUrl(oauthReturnTo, {
          gcal: 'success',
        }),
      );
    } catch {
      return res.redirect(
        302,
        this.buildFrontendReturnUrl(oauthReturnTo, {
          gcal: 'error',
          reason: 'exchange_failed',
        }),
      );
    }
  }

  @UseGuards(JwtAuthGuard)
  @Get('status')
  @ApiOperation({ summary: 'Google Calendar connection status' })
  getStatus(@Req() req: Request) {
    const user = req.user as AuthUserPayload;
    return this.googleCalendarService.getConnectionStatus(user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Post('sync')
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @ApiOperation({ summary: 'Sync upcoming Mezonly lessons to Google Calendar' })
  syncLessons(@Req() req: Request) {
    const user = req.user as AuthUserPayload;
    return this.googleCalendarSyncService.syncLessons(user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('disconnect')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Disconnect Google Calendar' })
  async disconnect(@Req() req: Request) {
    const user = req.user as AuthUserPayload;
    await this.googleCalendarService.disconnect(user.sub);
  }
}
