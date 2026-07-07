import {
  Body,
  Controller,
  Get,
  Put,
  Post,
  Query,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { CookieOptions, Request, Response } from 'express';
import { Throttle } from '@nestjs/throttler';
import { AppConfigService } from '../../shared/services/app-config.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { AuthService } from './auth.service';
import { MezonCallbackQueryDto } from './dto/mezon-callback-query.dto';
import { MezonChannelAppLoginDto } from './dto/mezon-channel-app-login.dto';
import { MezonChannelAppService } from './services/mezon-channel-app.service';
import { UpdateUserTimezoneDto } from './dto/update-user-timezone.dto';
import type { AuthUserPayload } from './interfaces/auth.interfaces';

const REFRESH_TOKEN_MAX_AGE = 1000 * 60 * 60 * 24 * 30;
const OAUTH_STATE_COOKIE = 'oauth_state';
const OAUTH_ACTION_COOKIE = 'mezon_oauth_action';
const OAUTH_TIMEZONE_COOKIE = 'mezon_oauth_timezone';
const OAUTH_RETURN_TO_COOKIE = 'mezon_oauth_return_to';
const OAUTH_STATE_MAX_AGE = 1000 * 60 * 5;

@Controller('auth')
@ApiTags('Authentication')
@Throttle({ default: { ttl: 60000, limit: 40 } })
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly appConfig: AppConfigService,
    private readonly mezonChannelAppService: MezonChannelAppService
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

  private getRefreshCookieOptions(): CookieOptions {
    return {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: REFRESH_TOKEN_MAX_AGE,
      path: '/',
    };
  }

  private clearRefreshCookie(res: Response) {
    const base = {
      path: '/',
      httpOnly: true as const,
      secure: true as const,
      sameSite: 'lax' as const,
    };
    res.clearCookie('refresh_token', base);
    res.clearCookie('refresh_token', { ...base, partitioned: true });
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
      OAUTH_STATE_COOKIE,
      OAUTH_ACTION_COOKIE,
      OAUTH_TIMEZONE_COOKIE,
      OAUTH_RETURN_TO_COOKIE,
    ]) {
      res.clearCookie(name, clearOpts);
    }
  }

  private startMezonOAuth(
    res: Response,
    options: { sync?: boolean; returnTo?: string; timezone?: string }
  ) {
    const { url, state } = this.authService.buildMezonAuthorizeUrl();
    const cookieOptions = this.getOAuthStateCookieOptions();
    res.cookie(OAUTH_STATE_COOKIE, state, cookieOptions);
    if (options.sync) {
      res.cookie(OAUTH_ACTION_COOKIE, 'sync', cookieOptions);
    }
    if (options.returnTo) {
      res.cookie(OAUTH_RETURN_TO_COOKIE, options.returnTo, cookieOptions);
    }
    if (options.timezone) {
      res.cookie(OAUTH_TIMEZONE_COOKIE, options.timezone, cookieOptions);
    }
    return res.redirect(302, url);
  }

  @Get('mezon-oauth/start')
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  mezonOAuthStart(
    @Query('returnTo') returnTo: string | undefined,
    @Query('timezone') timezone: string | undefined,
    @Res() res: Response
  ) {
    return this.startMezonOAuth(res, {
      returnTo: returnTo?.trim() || undefined,
      timezone: timezone?.trim() || undefined,
    });
  }

  @Get('mezon-oauth/sync/start')
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  mezonOAuthSyncStart(@Query('returnTo') returnTo: string | undefined, @Res() res: Response) {
    return this.startMezonOAuth(res, {
      sync: true,
      returnTo: returnTo?.trim() || undefined,
    });
  }

  @Post('channel-app/login')
  @Throttle({ default: { ttl: 60000, limit: 20 } })
  async channelAppLogin(
    @Body() body: MezonChannelAppLoginDto,
    @Res({ passthrough: true }) res: Response
  ) {
    const result = await this.mezonChannelAppService.authenticateFromBase64Hash(body.hashData);

    res.cookie('refresh_token', result.tokens.refreshToken, this.getRefreshCookieOptions());

    return {
      user: result.user,
      accessToken: result.tokens.accessToken,
      idToken: result.idToken,
    };
  }

  @Get('mezon/callback')
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  async mezonOAuthCallback(
    @Query() query: MezonCallbackQueryDto,
    @Req() req: Request,
    @Res() res: Response
  ) {
    const cookieState = req.cookies?.[OAUTH_STATE_COOKIE] as string | undefined;
    const oauthAction = req.cookies?.[OAUTH_ACTION_COOKIE] as string | undefined;
    const oauthTimezone = req.cookies?.[OAUTH_TIMEZONE_COOKIE] as string | undefined;
    const oauthReturnTo = (req.cookies?.[OAUTH_RETURN_TO_COOKIE] as string | undefined) || '/';
    this.clearOAuthCookies(res);

    const { code, state } = query;
    if (!code?.trim() || !state?.trim()) {
      throw new UnauthorizedException('Missing OAuth code or state');
    }
    if (!cookieState || cookieState !== state) {
      throw new UnauthorizedException('Invalid OAuth state');
    }
    if (!this.authService.consumePendingOAuthState(state)) {
      throw new UnauthorizedException('Invalid or expired OAuth state');
    }

    if (oauthAction === 'sync') {
      const refreshToken = req.cookies.refresh_token as string | undefined;
      const validated = await this.authService.validateRefreshToken(refreshToken ?? '');
      if (!validated) {
        throw new UnauthorizedException('Must be signed in to sync Mezon profile');
      }
      if (refreshToken?.trim()) {
        await this.authService.revokeRefreshToken(refreshToken);
      }

      const result = await this.authService.syncProfileFromMezonWithCode(
        validated.user.id,
        code,
        state
      );
      res.cookie('refresh_token', result.tokens.refreshToken, this.getRefreshCookieOptions());
      return res.redirect(
        302,
        this.buildFrontendReturnUrl(oauthReturnTo, {
          sync: 'success',
          accessToken: result.tokens.accessToken,
        })
      );
    }

    const result = await this.authService.handleMezonCallback(
      code,
      state,
      oauthTimezone?.trim() || undefined
    );
    res.cookie('refresh_token', result.tokens.refreshToken, this.getRefreshCookieOptions());
    return res.redirect(
      302,
      this.buildFrontendReturnUrl(oauthReturnTo, {
        oauth: 'success',
        accessToken: result.tokens.accessToken,
      })
    );
  }

  @Post('refresh')
  @Throttle({ default: { ttl: 60000, limit: 30 } })
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const refreshToken = req.cookies.refresh_token;

    const tokens = await this.authService.refreshAccessToken(refreshToken);

    if (tokens.refreshToken) {
      res.cookie('refresh_token', tokens.refreshToken, this.getRefreshCookieOptions());
    }

    return { accessToken: tokens.accessToken };
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getMe(@Req() req: Request) {
    const jwtUser = req.user as { sub: string; idToken?: string | null };
    return this.authService.getCurrentUserForMe(jwtUser.sub, jwtUser.idToken);
  }

  @UseGuards(JwtAuthGuard)
  @Put('me/timezone')
  async updateTimezone(@Req() req: Request, @Body() body: UpdateUserTimezoneDto) {
    const user = req.user as AuthUserPayload;
    return this.authService.updateUserTimezone(user.sub, body.timezone);
  }

  @Post('logout')
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const refreshToken = req.cookies.refresh_token as string | undefined;

    await this.authService.revokeRefreshToken(refreshToken);

    this.clearRefreshCookie(res);

    return {
      success: true,
      message: 'Logged out successfully',
    };
  }
}
