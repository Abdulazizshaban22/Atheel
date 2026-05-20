import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '@madar/db';
import { POLICY_ACTIONS, POLICY_RESOURCES, type PolicyAction, type PolicyResource } from '../../../common/contracts/resource-action.catalog';
import type { RequestUser } from '../interfaces/request-user.interface';

export type PolicyDecision = {
  allowed: boolean;
  reason?: string;
  matchedRuleId?: string;
};

/**
 * Wave55: Simple policy engine (resource/action) with Prisma-backed overrides.
 * - Baseline: role->capabilities map
 * - Overrides: PolicyRule (allow/deny) per org and role/user
 */
@Injectable()
export class PolicyService {
  constructor(private readonly prisma: PrismaService) {}

  private isSuperAdmin(user?: RequestUser | null) {
    return Boolean(user?.roles?.includes('super_admin'));
  }

  private rolesForOrg(user: RequestUser, orgId: string): string[] {
    const orgRoles = user?.orgRoles || {};
    const roles = orgRoles[orgId] || [];
    return [...new Set((roles as any[]).map(String))];
  }

  private baselineAllows(role: string, resource: PolicyResource, action: PolicyAction): boolean {
    // Very explicit baseline (يمكن توسعته لاحقًا)
    const allow: Record<string, Partial<Record<PolicyResource | '*', PolicyAction[]>>> = {
      super_admin: { '*': [POLICY_ACTIONS.read, POLICY_ACTIONS.create, POLICY_ACTIONS.update, POLICY_ACTIONS.delete] },
      org_admin: {
        [POLICY_RESOURCES.organizations]: [POLICY_ACTIONS.read, POLICY_ACTIONS.update],
        [POLICY_RESOURCES.users]: [POLICY_ACTIONS.read, POLICY_ACTIONS.create, POLICY_ACTIONS.update, POLICY_ACTIONS.delete],
        [POLICY_RESOURCES.projects]: [POLICY_ACTIONS.read, POLICY_ACTIONS.create, POLICY_ACTIONS.update, POLICY_ACTIONS.delete],
        [POLICY_RESOURCES.content]: [POLICY_ACTIONS.read, POLICY_ACTIONS.create, POLICY_ACTIONS.update, POLICY_ACTIONS.delete],
        [POLICY_RESOURCES.experiences]: [POLICY_ACTIONS.read, POLICY_ACTIONS.create, POLICY_ACTIONS.update, POLICY_ACTIONS.delete],
        [POLICY_RESOURCES.attachments]: [POLICY_ACTIONS.read, POLICY_ACTIONS.create, POLICY_ACTIONS.update, POLICY_ACTIONS.delete],
        [POLICY_RESOURCES.twins]: [POLICY_ACTIONS.read, POLICY_ACTIONS.create, POLICY_ACTIONS.update, POLICY_ACTIONS.delete],
        [POLICY_RESOURCES.approvals]: [POLICY_ACTIONS.read, POLICY_ACTIONS.create, POLICY_ACTIONS.update],
        [POLICY_RESOURCES.approvalPackets]: [POLICY_ACTIONS.read, POLICY_ACTIONS.create, POLICY_ACTIONS.update],
        [POLICY_RESOURCES.exports]: [POLICY_ACTIONS.read, POLICY_ACTIONS.create],
        [POLICY_RESOURCES.verification]: [POLICY_ACTIONS.read, POLICY_ACTIONS.create],
        [POLICY_RESOURCES.risks]: [POLICY_ACTIONS.read, POLICY_ACTIONS.create, POLICY_ACTIONS.update],
        [POLICY_RESOURCES.visitorGuides]: [POLICY_ACTIONS.read, POLICY_ACTIONS.create, POLICY_ACTIONS.update],
        [POLICY_RESOURCES.impact]: [POLICY_ACTIONS.read, POLICY_ACTIONS.create, POLICY_ACTIONS.update],
      },
      project_manager: {
        [POLICY_RESOURCES.projects]: [POLICY_ACTIONS.read, POLICY_ACTIONS.create, POLICY_ACTIONS.update],
        [POLICY_RESOURCES.experiences]: [POLICY_ACTIONS.read, POLICY_ACTIONS.create, POLICY_ACTIONS.update],
        [POLICY_RESOURCES.attachments]: [POLICY_ACTIONS.read, POLICY_ACTIONS.create, POLICY_ACTIONS.update],
        [POLICY_RESOURCES.approvals]: [POLICY_ACTIONS.read, POLICY_ACTIONS.create, POLICY_ACTIONS.update],
        [POLICY_RESOURCES.approvalPackets]: [POLICY_ACTIONS.read, POLICY_ACTIONS.create],
        [POLICY_RESOURCES.exports]: [POLICY_ACTIONS.read, POLICY_ACTIONS.create],
        [POLICY_RESOURCES.risks]: [POLICY_ACTIONS.read, POLICY_ACTIONS.create, POLICY_ACTIONS.update],
        [POLICY_RESOURCES.visitorGuides]: [POLICY_ACTIONS.read, POLICY_ACTIONS.create, POLICY_ACTIONS.update],
        [POLICY_RESOURCES.impact]: [POLICY_ACTIONS.read, POLICY_ACTIONS.create, POLICY_ACTIONS.update],
      },
      curator: {
        [POLICY_RESOURCES.content]: [POLICY_ACTIONS.read, POLICY_ACTIONS.create, POLICY_ACTIONS.update],
        [POLICY_RESOURCES.attachments]: [POLICY_ACTIONS.read, POLICY_ACTIONS.create, POLICY_ACTIONS.update],
        [POLICY_RESOURCES.approvals]: [POLICY_ACTIONS.read, POLICY_ACTIONS.create, POLICY_ACTIONS.update],
        [POLICY_RESOURCES.approvalPackets]: [POLICY_ACTIONS.read],
        [POLICY_RESOURCES.exports]: [POLICY_ACTIONS.read],
        [POLICY_RESOURCES.risks]: [POLICY_ACTIONS.read],
        [POLICY_RESOURCES.visitorGuides]: [POLICY_ACTIONS.read, POLICY_ACTIONS.create, POLICY_ACTIONS.update],
      },
      content_editor: {
        [POLICY_RESOURCES.content]: [POLICY_ACTIONS.read, POLICY_ACTIONS.create, POLICY_ACTIONS.update],
        [POLICY_RESOURCES.attachments]: [POLICY_ACTIONS.read, POLICY_ACTIONS.create, POLICY_ACTIONS.update],
        [POLICY_RESOURCES.approvals]: [POLICY_ACTIONS.read, POLICY_ACTIONS.create, POLICY_ACTIONS.update],
        [POLICY_RESOURCES.approvalPackets]: [POLICY_ACTIONS.read],
        [POLICY_RESOURCES.exports]: [POLICY_ACTIONS.read],
      },
      experience_designer: {
        [POLICY_RESOURCES.experiences]: [POLICY_ACTIONS.read, POLICY_ACTIONS.create, POLICY_ACTIONS.update],
        [POLICY_RESOURCES.twins]: [POLICY_ACTIONS.read, POLICY_ACTIONS.create, POLICY_ACTIONS.update],
        [POLICY_RESOURCES.approvalPackets]: [POLICY_ACTIONS.read, POLICY_ACTIONS.create],
        [POLICY_RESOURCES.exports]: [POLICY_ACTIONS.read, POLICY_ACTIONS.create],
      },
      analyst: {
        [POLICY_RESOURCES.dashboards]: [POLICY_ACTIONS.read],
        [POLICY_RESOURCES.analytics]: [POLICY_ACTIONS.read],
        [POLICY_RESOURCES.projects]: [POLICY_ACTIONS.read],
        [POLICY_RESOURCES.content]: [POLICY_ACTIONS.read],
        [POLICY_RESOURCES.experiences]: [POLICY_ACTIONS.read],
        [POLICY_RESOURCES.approvals]: [POLICY_ACTIONS.read],
        [POLICY_RESOURCES.risks]: [POLICY_ACTIONS.read],
        [POLICY_RESOURCES.impact]: [POLICY_ACTIONS.read],
        [POLICY_RESOURCES.attachments]: [POLICY_ACTIONS.read],
        [POLICY_RESOURCES.approvalPackets]: [POLICY_ACTIONS.read],
        [POLICY_RESOURCES.exports]: [POLICY_ACTIONS.read],
      },
      viewer: {
        [POLICY_RESOURCES.projects]: [POLICY_ACTIONS.read],
        [POLICY_RESOURCES.content]: [POLICY_ACTIONS.read],
        [POLICY_RESOURCES.experiences]: [POLICY_ACTIONS.read],
        [POLICY_RESOURCES.attachments]: [POLICY_ACTIONS.read],
        [POLICY_RESOURCES.twins]: [POLICY_ACTIONS.read],
        [POLICY_RESOURCES.approvals]: [POLICY_ACTIONS.read],
        [POLICY_RESOURCES.approvalPackets]: [POLICY_ACTIONS.read],
        [POLICY_RESOURCES.exports]: [POLICY_ACTIONS.read],
        [POLICY_RESOURCES.risks]: [POLICY_ACTIONS.read],
        [POLICY_RESOURCES.visitorGuides]: [POLICY_ACTIONS.read],
        [POLICY_RESOURCES.impact]: [POLICY_ACTIONS.read],
      },
    };

    const caps = allow[role];
    if (!caps) return false;
    const direct = caps[resource] || [];
    const wildcard = caps['*'] || [];
    return direct.includes(action) || wildcard.includes(action);
  }

  /**
   * Evaluate policy for a given org.
   * Throws ForbiddenException if not allowed (default deny when no match).
   */
  async assertAllowed(params: { user: RequestUser; organizationId: string; resource: PolicyResource; action: PolicyAction }) {
    const decision = await this.decide(params);
    if (!decision.allowed) {
      throw new ForbiddenException(decision.reason || 'لا تملك صلاحية لهذه العملية');
    }
    return decision;
  }

  async decide(params: { user: RequestUser; organizationId: string; resource: PolicyResource; action: PolicyAction }): Promise<PolicyDecision> {
    const { user, organizationId, resource, action } = params;

    if (this.isSuperAdmin(user)) return { allowed: true, reason: 'super_admin' };

    const orgIds = (user.orgIds || []).map(String);
    if (!orgIds.includes(String(organizationId))) {
      return { allowed: false, reason: 'لا تملك صلاحية الوصول لهذه الجهة' };
    }

    // 1) Prisma overrides (deny/allow) with priority
    try {
      const rules = await (this.prisma as Record<string, unknown>).policyRule?.findMany?.({
        where: {
          organizationId,
          resource,
          action,
          OR: [
            { userId: user.sub },
            { role: { in: this.rolesForOrg(user, organizationId) as any } },
          ],
        },
        orderBy: [{ priority: 'asc' }, { updatedAt: 'desc' }],
        take: 20,
      });

      if (Array.isArray(rules) && rules.length) {
        const r = rules[0];
        const effect = String(r.effect || 'allow');
        return { allowed: effect === 'allow', reason: `rule:${effect}`, matchedRuleId: r.id };
      }
    } catch {
      // ignore (dev mode can still work with baseline)
    }

    // 2) Baseline role map
    const roles = this.rolesForOrg(user, organizationId);
    for (const role of roles) {
      if (this.baselineAllows(role, resource, action)) {
        return { allowed: true, reason: `baseline:${role}` };
      }
    }

    return { allowed: false, reason: 'لا توجد قاعدة صلاحيات تسمح بهذه العملية' };
  }
}
