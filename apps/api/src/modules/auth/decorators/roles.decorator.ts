import { SetMetadata } from '@nestjs/common';
import { ROLES_KEY, type PlatformRole } from '../constants';

export const Roles = (...roles: PlatformRole[]) => SetMetadata(ROLES_KEY, roles);
