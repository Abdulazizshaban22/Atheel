import { SetMetadata } from '@nestjs/common';
import type { AuditEntityType, CoreMutationAction } from '../contracts/resource-action.catalog';

export const AUDIT_ACTION_KEY = 'atheel:audit-action';

export type AuditActionMetadata = {
  action: CoreMutationAction | string;
  entityType: AuditEntityType | string;
  entityIdParam?: string;
  entityIdBodyField?: string;
  organizationIdBodyField?: string;
  message?: string;
  skipAutoRecord?: boolean;
};

/**
 * Marks a mutating route as audit-worthy.
 * The interceptor resolves actor/org/entity context from request + response.
 */
export function AuditAction(metadata: AuditActionMetadata) {
  return SetMetadata(AUDIT_ACTION_KEY, metadata);
}
