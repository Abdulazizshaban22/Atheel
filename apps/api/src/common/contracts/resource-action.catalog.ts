export const POLICY_ACTIONS = {
  read: 'read',
  create: 'create',
  update: 'update',
  delete: 'delete',
} as const;

export type PolicyAction = typeof POLICY_ACTIONS[keyof typeof POLICY_ACTIONS];

export const POLICY_RESOURCES = {
  organizations: 'organizations',
  users: 'users',
  capabilities: 'capabilities',
  projects: 'projects',
  content: 'content',
  experiences: 'experiences',
  attachments: 'attachments',
  twins: 'twins',
  approvals: 'approvals',
  approvalPackets: 'approval_packets',
  exports: 'exports',
  verification: 'verification',
  risks: 'risks',
  visitorGuides: 'visitor_guides',
  impact: 'impact',
  dashboards: 'dashboards',
  analytics: 'analytics',
} as const;

export type PolicyResource = typeof POLICY_RESOURCES[keyof typeof POLICY_RESOURCES];

export const AUDIT_ENTITY_TYPES = {
  user: 'user',
  project: 'project',
  content: 'content',
  experience: 'experience',
  attachment: 'attachment',
  approvalRequest: 'approval_request',
} as const;

export type AuditEntityType = typeof AUDIT_ENTITY_TYPES[keyof typeof AUDIT_ENTITY_TYPES];

export const CORE_MUTATION_ACTIONS = {
  userCreate: 'user.create',
  userUpdate: 'user.update',
  userRolesUpdate: 'user.roles.update',
  userDelete: 'user.delete',
  projectCreate: 'project.create',
  projectUpdate: 'project.update',
  projectDelete: 'project.delete',
  contentCreate: 'content.create',
  contentUpdate: 'content.update',
  contentDelete: 'content.delete',
  experienceBlueprintBuild: 'experience.blueprint.build',
  experienceJourneyUpdate: 'experience.journey.update',
  experienceCreate: 'experience.create',
  experienceUpdate: 'experience.update',
  experienceTwinEnsure: 'experience.twin.ensure',
  experienceTwinSyncQueued: 'experience.twin.sync.queued',
  experienceTwinEnsureFailed: 'experience.twin.ensure.failed',
  experienceTwinSyncWorkerFailed: 'experience.twin.sync.worker.failed',
  experienceTwinDeadLetterReplay: 'experience.twin.dead_letter.replay',
  experienceDelete: 'experience.delete',
  approvalCreate: 'approval.create',
  approvalSubmit: 'approval.submit',
  approvalApprove: 'approval.approve',
  approvalReject: 'approval.reject',
  approvalRequestChanges: 'approval.request_changes',
  approvalCancel: 'approval.cancel',
  attachmentUpload: 'attachment.upload',
  attachmentCreateFromBuffer: 'attachment.create_from_buffer',
  attachmentCreateFromFilePath: 'attachment.create_from_file_path',
  attachmentLink: 'attachment.link',
} as const;

export type CoreMutationAction = typeof CORE_MUTATION_ACTIONS[keyof typeof CORE_MUTATION_ACTIONS];

export const CORE_EVENT_TYPES = {
  experienceCreated: 'experience.created',
  experienceUpdated: 'experience.updated',
  experienceDeleted: 'experience.deleted',
  experienceTwinEnsured: 'experience.twin_ensured',
  experienceTwinSyncQueued: 'experience.twin_sync_queued',
  experienceTwinSyncFailed: 'experience.twin_sync_failed',
  experienceTwinSyncWorkerFailed: 'experience.twin_sync_worker_failed',
  experienceTwinDeadLetterReplayed: 'experience.twin_dead_letter_replayed',
  approvalCreated: 'approval.created',
  approvalSubmitted: 'approval.submitted',
  approvalApproved: 'approval.approved',
  approvalRejected: 'approval.rejected',
  approvalChangesRequested: 'approval.changes_requested',
  approvalCancelled: 'approval.cancelled',
  attachmentUploaded: 'attachment.uploaded',
  attachmentCreatedFromBuffer: 'attachment.created_from_buffer',
  attachmentCreatedFromFilePath: 'attachment.created_from_file_path',
  attachmentSystemCreated: 'attachment.system_created',
  attachmentLinked: 'attachment.linked',
} as const;

export type CoreEventType = typeof CORE_EVENT_TYPES[keyof typeof CORE_EVENT_TYPES];

export const MUTATION_SUBJECT_KINDS = {
  user: 'User',
  project: 'Project',
  content: 'ContentItem',
  experience: 'VisitorExperience',
  attachment: 'Attachment',
  approvalRequest: 'ApprovalRequest',
} as const;

export type MutationSubjectKind = typeof MUTATION_SUBJECT_KINDS[keyof typeof MUTATION_SUBJECT_KINDS];

export function buildMutationSubject(subjectKind: MutationSubjectKind, entityId: string) {
  return `${subjectKind}/${entityId}`;
}

export const APPROVAL_STATUS_EVENT_TYPES = {
  submitted: CORE_EVENT_TYPES.approvalSubmitted,
  approved: CORE_EVENT_TYPES.approvalApproved,
  rejected: CORE_EVENT_TYPES.approvalRejected,
  changes_requested: CORE_EVENT_TYPES.approvalChangesRequested,
  cancelled: CORE_EVENT_TYPES.approvalCancelled,
} as const;

export function resolveApprovalEventType(status: string) {
  return APPROVAL_STATUS_EVENT_TYPES[status as keyof typeof APPROVAL_STATUS_EVENT_TYPES] ?? (`approval.${status}` as const);
}
