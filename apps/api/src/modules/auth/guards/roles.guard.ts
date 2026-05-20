import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY, type PlatformRole } from '../constants';
import type { RequestUser } from '../interfaces/request-user.interface';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<PlatformRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) return true;

    const request = context.switchToHttp().getRequest<{ user?: RequestUser }>();
    const user = request.user;
    if (!user) {
      throw new ForbiddenException('المستخدم غير معرّف على الطلب');
    }

    // Wave37: tenant-aware RBAC. Prefer orgRoles if activeOrgId present.
    const activeOrg = user.activeOrgId;
    const scopedRoles = activeOrg && user.orgRoles?.[activeOrg] ? user.orgRoles[activeOrg] : user.roles;
    const hasRole = requiredRoles.some((role) => (scopedRoles || []).includes(role));
    if (!hasRole) {
      throw new ForbiddenException(`الصلاحية المطلوبة: ${requiredRoles.join(' | ')}`);
    }
    return true;
  }
}
