import { SetMetadata } from '@nestjs/common';
import type { PolicyAction, PolicyResource } from '../../../common/contracts/resource-action.catalog';

export const POLICY_KEY = 'atheel:policy';

export type PolicyRequirement = {
  resource: PolicyResource;
  action: PolicyAction;
};

/**
 * Catalog-backed policy requirement (resource/action).
 * Example: @Policy(POLICY_RESOURCES.exports, POLICY_ACTIONS.create)
 */
export function Policy(resource: PolicyResource, action: PolicyAction) {
  return SetMetadata(POLICY_KEY, { resource, action } satisfies PolicyRequirement);
}
