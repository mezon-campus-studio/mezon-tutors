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
import { MezonExchangeDto } from './dto/mezon-exchange.dto';
import { SyncMezonProfileDto } from './dto/sync-mezon-profile.dto';

const REFRESH_TOKEN_MAX_AGE = 1000 * 60 * 60 * 24 * 30;
const OAUTH_STATE_COOKIE = 'oauth_state';
const OAUTH_STATE_MAX_AGE = 1000 * 60 * 10;

@Controller('auth')
@ApiTags('Authentication')
@Throttle({ default: { ttl: 60000, limit: 40 } })
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly appConfig: AppConfigService
  ) {}

  private getRefreshCookieOptions(): CookieOptions {
    const isProduction = this.appConfig.nodeEnv === 'production';

    return {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax',
      maxAge: REFRESH_TOKEN_MAX_AGE,
      path: '/',
    };
  }

  private getOAuthStateCookieOptions(): CookieOptions {
    const isProduction = this.appConfig.nodeEnv === 'production';

    return {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax',
      maxAge: OAUTH_STATE_MAX_AGE,
      path: '/',
    };
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

  @Get('url')
  getMezonOAuthUrl(@Res({ passthrough: true }) res: Response) {
    const { url, state } = this.authService.buildMezonAuthorizeUrl();
    res.cookie(OAUTH_STATE_COOKIE, state, this.getOAuthStateCookieOptions());
    return { url };
  }

  @Get('mezon')
  async redirectToMezon(@Res() res: Response) {
    const { url, state } = this.authService.buildMezonAuthorizeUrl();
    res.cookie(OAUTH_STATE_COOKIE, state, this.getOAuthStateCookieOptions());
    return res.redirect(url);
  }

  @Post('mezon/exchange')
  @Throttle({ default: { ttl: 60000, limit: 20 } })
  async mezonExchange(
    @Body() body: MezonExchangeDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response
  ) {
    const { code, state } = body;
    const cookieState = req.cookies?.[OAUTH_STATE_COOKIE] as string | undefined;

    if (!cookieState || cookieState !== state) {
      this.clearOAuthStateCookie(res);
      throw new UnauthorizedException('Invalid or expired OAuth state');
    }

    this.clearOAuthStateCookie(res);

    const result = await this.authService.handleMezonCallback(code, state);

    res.cookie('refresh_token', result.tokens.refreshToken, this.getRefreshCookieOptions());

    return {
      user: result.user,
      accessToken: result.tokens.accessToken,
      idToken: result.idToken,
    };
  }

  @Get('mezon/callback')
  mezonCallback(@Query() query: MezonCallbackQueryDto, @Res() res: Response) {
    const { code, state } = query;
    const base = this.appConfig.frontendUrl.replace(/\/+$/, '');
    const params = new URLSearchParams();
    if (code) params.set('code', code);
    if (state) params.set('state', state);
    const redirectUrl = `${base}/auth/mezon/callback?${params.toString()}`;
    return res.redirect(302, redirectUrl);
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
    const jwtUser = req.user as { sub: string };
    return this.authService.getCurrentUserForMe(jwtUser.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Post('mezon/sync-profile')
  @Throttle({ default: { ttl: 60000, limit: 20 } })
  async syncMezonProfile(
    @Body() body: SyncMezonProfileDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response
  ) {
    const { code, state } = body;
    const cookieState = req.cookies?.[OAUTH_STATE_COOKIE] as string | undefined;

    if (!cookieState || cookieState !== state) {
      this.clearOAuthStateCookie(res);
      throw new UnauthorizedException('Invalid or expired OAuth state');
    }

    this.clearOAuthStateCookie(res);

    const previousRefreshToken = req.cookies?.refresh_token as string | undefined;
    if (previousRefreshToken?.trim()) {
      await this.authService.revokeRefreshToken(previousRefreshToken);
    }

    const jwtUser = req.user as { sub: string };
    const result = await this.authService.syncProfileFromMezonWithCode(jwtUser.sub, code, state);

    res.cookie('refresh_token', result.tokens.refreshToken, this.getRefreshCookieOptions());

    return {
      user: result.user,
      accessToken: result.tokens.accessToken,
      idToken: result.idToken,
    };
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
