# خريطة الجداول الأساسية v0.3 — Columns أولية

## User
- id
- email (unique)
- displayName
- isActive
- passwordHash
- refreshTokenHash
- lastLoginAt
- createdAt / updatedAt

## OrganizationMember
- id
- userId
- organizationId
- role (PlatformRole)
- createdAt
- unique(userId, organizationId, role)

## Attachment
- id
- organizationId
- entityType (project/content/experience)
- entityId
- originalName
- mimeType
- extension
- sizeBytes
- storageProvider
- storagePath
- checksumSha256
- uploadedByUserId
- uploadedAt
- metadata (JSON)

## ApprovalRequest
- id
- organizationId
- entityType
- entityId
- title
- status
- submittedByUserId
- currentApproverId
- decisionNote
- requestedChanges
- submittedAt / decidedAt / dueAt
- payloadSnapshot (JSON)
- createdAt / updatedAt

## AuditLog
- id
- organizationId
- actorUserId
- action
- entityType / entityId
- severity
- message
- before (JSON)
- after (JSON)
- ipAddress / userAgent
- createdAt
