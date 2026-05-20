import type { PlatformRole } from '../constants';

export interface RequestUser {
  sub: string;
  email: string;
  name: string;
  roles: PlatformRole[];
  orgIds?: string[];

  /**
   * Wave37: roles per organization (tenant-aware RBAC)
   * Example: { "org_123": ["viewer","content_editor"] }
   */
  orgRoles?: Record<string, PlatformRole[]>;

  /**
   * Wave37: active org inferred from request (X-Org-Id / organizationId)
   */
  activeOrgId?: string;
}
