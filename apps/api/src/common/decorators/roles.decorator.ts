import { SetMetadata } from '@nestjs/common';
import { Role } from '@mezon-tutors/db';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
