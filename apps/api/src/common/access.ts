import { ForbiddenException } from '@nestjs/common';
import type { RequestUser } from '../modules/auth/interfaces/request-user.interface';

export function isSuperAdmin(user?: RequestUser | null): boolean {
  return Boolean(user?.roles?.includes('super_admin'));
}

export function isOrgAdmin(user?: RequestUser | null): boolean {
  return Boolean(user?.roles?.includes('org_admin') || user?.roles?.includes('super_admin'));
}

export function hasOrgAccess(user: RequestUser | undefined, organizationId?: string | null): boolean {
  if (!organizationId) return true;
  if (!user) return false;
  if (isSuperAdmin(user)) return true;
  const orgIds = user.orgIds || [];
  return orgIds.includes(organizationId);
}

export function assertOrgAccess(user: RequestUser | undefined, organizationId?: string | null) {
  if (!hasOrgAccess(user, organizationId)) {
    throw new ForbiddenException('لا تملك صلاحية الوصول لهذه الجهة');
  }
}

export function assertOrgAccessFromMany(user: RequestUser | undefined, organizationId?: string | null, allowedOrgIds: string[] = []) {
  if (!organizationId) return;
  if (isSuperAdmin(user)) return;
  const allowed = allowedOrgIds.includes(organizationId) || (user?.orgIds || []).includes(organizationId);
  if (!allowed) throw new ForbiddenException('لا تملك صلاحية الوصول لهذه الجهة');
}
