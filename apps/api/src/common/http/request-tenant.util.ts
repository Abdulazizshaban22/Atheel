import { ApiRequestLike, readHeader, readRecordString } from './api-request.types';

export function resolveTenantCandidates(req: ApiRequestLike) {
  return {
    headerOrgId: readHeader(req.headers, 'x-org-id') || readHeader(req.headers, 'x-organization-id'),
    queryOrganizationId: readRecordString(req.query, 'organizationId') || readRecordString(req.query, 'orgId'),
    paramOrganizationId: readRecordString(req.params, 'organizationId') || readRecordString(req.params, 'orgId'),
    bodyOrganizationId: readRecordString(req.body, 'organizationId') || readRecordString(req.body, 'orgId'),
  };
}

export function pickTenantId(req: ApiRequestLike): string {
  const candidates = resolveTenantCandidates(req);
  return Object.values(candidates)
    .map((value) => (value ? String(value) : ''))
    .find(Boolean) || '';
}

export function findTenantConflict(req: ApiRequestLike): { values: string[] } | null {
  const candidates = resolveTenantCandidates(req);
  const values = Object.values(candidates)
    .map((value) => (value ? String(value).trim() : ''))
    .filter(Boolean);
  const unique = [...new Set(values)];
  return unique.length > 1 ? { values: unique } : null;
}
