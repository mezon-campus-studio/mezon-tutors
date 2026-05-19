import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AppConfigService } from '../../../shared/services/app-config.service';
import { UserService } from '../../user/user.service';
import { AuthService } from '../auth.service';
import { validateMezonHash } from '../utils/mezon-channel-app-crypto.util';

type ChannelAppUser = {
  id?: number | string;
  username?: string;
  display_name?: string;
  avatar_url?: string;
};

const AUTH_MAX_AGE_SECONDS = 3600;

@Injectable()
export class MezonChannelAppService {
  constructor(
    private readonly appConfig: AppConfigService,
    private readonly userService: UserService,
    private readonly authService: AuthService
  ) {}

  async authenticateFromBase64Hash(hashDataBase64: string) {
    let decoded: string;
    try {
      decoded = Buffer.from(hashDataBase64, 'base64').toString('utf-8');
    } catch {
      throw new BadRequestException('Invalid hashData encoding');
    }

    return this.authenticateLaunch(decoded);
  }

  async authenticateLaunch(decoded: string) {
    const appSecret = this.appConfig.mezonAppSecret;
    if (!validateMezonHash(appSecret, decoded)) {
      throw new UnauthorizedException('Invalid Mezon Channel App hash');
    }

    const params = new URLSearchParams(decoded);
    const authUser = JSON.parse(
      (params.get('user') ?? '{}').replace(/"id":(\d+)/, '"id":"$1"')
    ) as ChannelAppUser;

    const authDate = Number.parseInt(params.get('auth_date') ?? '0', 10);
    if (!authDate || Date.now() / 1000 - authDate > AUTH_MAX_AGE_SECONDS) {
      throw new UnauthorizedException('Authentication expired');
    }

    const mezonUserId = String(authUser.id ?? '');
    if (!mezonUserId) {
      throw new BadRequestException('Missing Mezon user id');
    }

    const username =
      authUser.username ||
      authUser.display_name ||
      `user-${mezonUserId.substring(0, 8)}`;

    const user = await this.userService.upsertFromMezon({
      mezonUserId,
      username,
      avatar: authUser.avatar_url ?? null,
      email: '',
    });

    const tokens = await this.authService.generateTokens(user);

    return {
      user: {
        id: user.id,
        mezonUserId: user.mezonUserId,
        username: user.username,
        role: user.role,
        avatar: user.avatar,
        email: user.email ?? null,
      },
      tokens,
      idToken: null,
    };
  }
}
