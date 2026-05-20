import { applyDecorators } from '@nestjs/common';
import { AuditAction } from '../audit/audit-action.decorator';
import { Policy } from '../../modules/auth/decorators/policy.decorator';
import type { AuditEntityType, CoreMutationAction, PolicyAction, PolicyResource } from './resource-action.catalog';

export type CoreMutationRouteMetadata = {
  policyResource: PolicyResource;
  policyAction: PolicyAction;
  auditAction: CoreMutationAction;
  entityType: AuditEntityType;
  entityIdParam?: string;
  entityIdBodyField?: string;
  organizationIdBodyField?: string;
  message: string;
  skipAutoRecord?: boolean;
};

export function CoreMutationRoute(metadata: CoreMutationRouteMetadata) {
  return applyDecorators(
    Policy(metadata.policyResource, metadata.policyAction),
    AuditAction({
      action: metadata.auditAction,
      entityType: metadata.entityType,
      entityIdParam: metadata.entityIdParam,
      entityIdBodyField: metadata.entityIdBodyField,
      organizationIdBodyField: metadata.organizationIdBodyField,
      message: metadata.message,
      skipAutoRecord: metadata.skipAutoRecord,
    }),
  );
}
