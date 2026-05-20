import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY, ROLES_KEY, type PlatformRole } from '../constants';
import type { RequestUser } from '../interfaces/request-user.interface';
import { POLICY_KEY, type PolicyRequirement } from '../decorators/policy.decorator';
import { PolicyService } from '../policy/policy.service';
import type { ApiRequestLike } from '../../../common/http/api-request.types';

type Action = 'read' | 'create' | 'update' | 'delete';

function actionFromMethod(method: string): Action {
  const m = method.toUpperCase();
  if (m === 'GET' || m === 'HEAD') return 'read';
  if (m === 'POST') return 'create';
  if (m === 'DELETE') return 'delete';
  return 'update';
}

function hasElevatedRole(user?: RequestUser | null): boolean {
  const roles = user?.roles || [];
  return roles.some((r) => ['super_admin', 'org_admin', 'project_manager', 'content_editor', 'curator', 'analyst'].includes(String(r)));
}

/**
 * Wave37: Policy/RBAC guard
 *
 * - If @Roles() is present, we assume RolesGuard enforces it.
 * - Otherwise we apply a safe default policy:
 *   - read: any authenticated user
 *   - create/update/delete: requires elevated role
 */
@Injectable()
export class PolicyGuard implements CanActivate {
  constructor(private readonly reflector: Reflector, private readonly policy: PolicyService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const requiredRoles = this.reflector.getAllAndOverride<PlatformRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    const requiredPolicy = this.reflector.getAllAndOverride<PolicyRequirement>(POLICY_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // If @Roles exists without @Policy, RolesGuard will enforce RBAC and we can skip.
    if ((requiredRoles && requiredRoles.length) && !requiredPolicy) return true;

    const req = context.switchToHttp().getRequest<ApiRequestLike>();
    const user = req?.user as RequestUser | undefined;
    if (!user) throw new ForbiddenException('المستخدم غير معرّف');

    const action = requiredPolicy?.action || actionFromMethod(String(req?.method || 'GET'));

    // If no explicit @Policy: keep safe default behavior to avoid breaking existing controllers
    if (!requiredPolicy) {
      if (action === 'read') return true;
      if (!hasElevatedRole(user)) throw new ForbiddenException('هذه العملية تتطلب صلاحيات أعلى من viewer');
      return true;
    }

    // Resolve org scope
    const orgId = String(user.activeOrgId || req?.__orgId || req?.body?.organizationId || req?.query?.organizationId || req?.params?.organizationId || '');
    if (!orgId && !hasElevatedRole(user)) {
      throw new ForbiddenException('يجب تحديد الجهة لتقييم الصلاحيات');
    }

    // Throws ForbiddenException if not allowed
    await this.policy.assertAllowed({ user, organizationId: orgId, resource: requiredPolicy.resource, action });
    return true;
  }
}
