import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Role } from '@mezon-tutors/db';
import type { Request } from 'express';
import type { AuthUserPayload } from '../../modules/auth/interfaces/auth.interfaces';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request & { user?: AuthUserPayload }>();
    const jwtUser = request.user;
    if (!jwtUser?.sub) {
      throw new ForbiddenException('Unauthorized');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: jwtUser.sub },
      select: { role: true },
    });

    if (!user) {
      throw new ForbiddenException('Unauthorized');
    }

    if (user.role !== Role.ADMIN) {
      throw new ForbiddenException('Admin access required');
    }

    return true;
  }
}
