import { BadRequestException, CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { getRequestContext } from '../../../common/request-context';
import { findTenantConflict, pickTenantId } from '../../../common/http/request-tenant.util';
import { IS_PUBLIC_KEY } from '../constants';
import type { RequestUser } from '../interfaces/request-user.interface';

function isSuperAdmin(user?: RequestUser | null) {
  return Boolean(user?.roles?.includes('super_admin'));
}

/**
 * Wave92: Tenant enforcement tightening
 * - Reject conflicting org IDs across header/query/body/params.
 * - Resolve active tenant once and propagate it to request + request context.
 * - Keep super_admin cross-tenant capable without weakening non-admin isolation.
 */
@Injectable()
export class TenantGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const req = context.switchToHttp().getRequest<any>();

    const conflict = findTenantConflict(req);
    if (conflict) {
      throw new BadRequestException(`تم إرسال أكثر من organizationId بقيم متعارضة: ${conflict.values.join(' | ')}`);
    }

    // Auth endpoints are identity-scoped (not tenant-scoped)
    const url = String(req?.originalUrl || req?.url || '');
    if (url.includes('/auth/')) return true;
    const user = req?.user as RequestUser | undefined;
    if (!user) return true; // JwtAuthGuard handles missing user

    if (isSuperAdmin(user)) {
      const orgId = pickTenantId(req);
      if (orgId) {
        user.activeOrgId = orgId;
        req.__orgId = orgId;
        try {
          const ctx = getRequestContext();
          ctx.organizationId = orgId;
        } catch {}
      }
      return true;
    }

    const userOrgs = (user.orgIds || []).map(String).filter(Boolean);
    let orgId = pickTenantId(req);

    if (!orgId) {
      if (userOrgs.length === 1) orgId = userOrgs[0];
      else throw new BadRequestException('يجب تحديد الجهة عبر X-Org-Id أو organizationId');
    }

    if (!userOrgs.includes(orgId)) {
      throw new ForbiddenException('لا تملك صلاحية الوصول لهذه الجهة');
    }

    // Attach tenant context
    user.activeOrgId = orgId;
    req.__orgId = orgId;
    req.organizationIdHint = orgId;

    try {
      const ctx = getRequestContext();
      ctx.organizationId = orgId;
    } catch {}

    // Convenience: inject into body/query if missing
    if (req?.body && !req.body.organizationId) req.body.organizationId = orgId;
    if (req?.query && !req.query.organizationId) req.query.organizationId = orgId;
    return true;
  }
}
