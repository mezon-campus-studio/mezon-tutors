import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@mezon-tutors/db';
import type { Request } from 'express';
import { ROLES_KEY } from '../decorators/roles.decorator';
import type { AuthUserPayload } from '../../modules/auth/interfaces/auth.interfaces';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

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

    if (!requiredRoles.includes(user.role)) {
      throw new ForbiddenException('Admin access required');
    }

    return true;
  }
}
