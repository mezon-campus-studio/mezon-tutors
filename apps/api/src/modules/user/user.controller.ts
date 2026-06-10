import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { TrustShowcaseDto } from '@mezon-tutors/shared';
import { UserService } from './user.service';

const TRUST_SHOWCASE_AVATAR_COUNT = 4;

@Controller('users')
@ApiTags('Users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('trust-showcase-avatars')
  @ApiOperation({ summary: 'Random user avatars for public marketing UI' })
  getTrustShowcaseAvatars(): Promise<TrustShowcaseDto> {
    return this.userService.findRandomTrustShowcaseAvatars(TRUST_SHOWCASE_AVATAR_COUNT);
  }
}
