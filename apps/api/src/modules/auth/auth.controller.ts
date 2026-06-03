import {
  Body,
  Controller,
  Get,
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

const REFRESH_TOKEN_MAX_AGE = 1000 * 60 * 60 * 24 * 30;
const OAUTH_STATE_COOKIE = 'oauth_state';
const OAUTH_ACTION_COOKIE = 'mezon_oauth_action';
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

  private getCrossSiteCookieOptions(maxAge: number): CookieOptions {
    const isProduction = this.appConfig.nodeEnv === 'production';

    return {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax',
      maxAge,
      path: '/',
      ...(isProduction ? { partitioned: true } : {}),
    };
  }

  private getRefreshCookieOptions(): CookieOptions {
    return this.getCrossSiteCookieOptions(REFRESH_TOKEN_MAX_AGE);
  }

  private getOAuthStateCookieOptions(): CookieOptions {
    return this.getCrossSiteCookieOptions(OAUTH_STATE_MAX_AGE);
  }

  private clearOAuthStateCookie(res: Response) {
    const opts = this.getOAuthStateCookieOptions();
    res.clearCookie(OAUTH_STATE_COOKIE, {
      path: opts.path ?? '/',
      httpOnly: opts.httpOnly,
      secure: opts.secure,
      sameSite: opts.sameSite,
    });
  }

  private clearOAuthActionCookie(res: Response) {
    const opts = this.getOAuthStateCookieOptions();
    res.clearCookie(OAUTH_ACTION_COOKIE, {
      path: opts.path ?? '/',
      httpOnly: opts.httpOnly,
      secure: opts.secure,
      sameSite: opts.sameSite,
    });
  }

  @Get('mezon-oauth/start')
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  mezonOAuthStart(@Res() res: Response) {
    const { url, state } = this.authService.buildMezonAuthorizeUrl();
    res.cookie(OAUTH_STATE_COOKIE, state, this.getOAuthStateCookieOptions());
    return res.redirect(302, url);
  }

  @Get('mezon-oauth/sync/start')
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  mezonOAuthSyncStart(@Res() res: Response) {
    const { url, state } = this.authService.buildMezonAuthorizeUrl();
    res.cookie(OAUTH_STATE_COOKIE, state, this.getOAuthStateCookieOptions());
    res.cookie(OAUTH_ACTION_COOKIE, 'sync', this.getOAuthStateCookieOptions());
    return res.redirect(302, url);
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
    this.clearOAuthStateCookie(res);
    this.clearOAuthActionCookie(res);

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

    const frontendBase = this.appConfig.frontendUrl.replace(/\/+$/, '');

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
      return res.redirect(302, `${frontendBase}/dashboard?sync=success`);
    }

    const result = await this.authService.handleMezonCallback(code, state);
    res.cookie('refresh_token', result.tokens.refreshToken, this.getRefreshCookieOptions());
    return res.redirect(302, `${frontendBase}/?oauth=success`);
  }

  @Post('refresh')
  @Throttle({ default: { ttl: 60000, limit: 30 } })
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const refreshToken = req.cookies.refresh_token;

    const tokens = await this.authService.refreshAccessToken(refreshToken);

    res.cookie('refresh_token', tokens.refreshToken, this.getRefreshCookieOptions());

    return { accessToken: tokens.accessToken };
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getMe(@Req() req: Request) {
    const jwtUser = req.user as { sub: string; idToken?: string | null };
    return this.authService.getCurrentUserForMe(jwtUser.sub, jwtUser.idToken);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const refreshToken = req.cookies.refresh_token;

    await this.authService.revokeRefreshToken(refreshToken);

    const opts = this.getRefreshCookieOptions();
    res.clearCookie('refresh_token', {
      path: opts.path ?? '/',
      httpOnly: opts.httpOnly,
      secure: opts.secure,
      sameSite: opts.sameSite,
    });

    return {
      success: true,
      message: 'Logged out successfully',
    };
  }
}
