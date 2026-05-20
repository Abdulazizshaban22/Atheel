import 'reflect-metadata';
import { AUDIT_ACTION_KEY } from '../src/common/audit/audit-action.decorator';
import { POLICY_KEY } from '../src/modules/auth/decorators/policy.decorator';
import { AUDIT_ENTITY_TYPES, CORE_MUTATION_ACTIONS, POLICY_ACTIONS, POLICY_RESOURCES } from '../src/common/contracts/resource-action.catalog';
import { ProjectsController } from '../src/modules/projects/projects.controller';
import { ApprovalsController } from '../src/modules/approvals/approvals.controller';
import { AttachmentsController } from '../src/modules/attachments/attachments.controller';
import { UsersController } from '../src/modules/users/users.controller';
import { ExportsController } from '../src/modules/exports/exports.controller';

describe('Wave95 mutation contract catalog', () => {
  it('applies a catalog-backed policy and audit contract to core project mutations', () => {
    const policy = Reflect.getMetadata(POLICY_KEY, ProjectsController.prototype.create);
    const audit = Reflect.getMetadata(AUDIT_ACTION_KEY, ProjectsController.prototype.create);

    expect(policy).toEqual({
      resource: POLICY_RESOURCES.projects,
      action: POLICY_ACTIONS.create,
    });

    expect(audit).toMatchObject({
      action: CORE_MUTATION_ACTIONS.projectCreate,
      entityType: AUDIT_ENTITY_TYPES.project,
      organizationIdBodyField: 'organizationId',
      skipAutoRecord: true,
    });
  });

  it('keeps approval decision routes aligned with the centralized mutation catalog', () => {
    const policy = Reflect.getMetadata(POLICY_KEY, ApprovalsController.prototype.approve);
    const audit = Reflect.getMetadata(AUDIT_ACTION_KEY, ApprovalsController.prototype.approve);

    expect(policy).toEqual({
      resource: POLICY_RESOURCES.approvals,
      action: POLICY_ACTIONS.update,
    });

    expect(audit).toMatchObject({
      action: CORE_MUTATION_ACTIONS.approvalApprove,
      entityType: AUDIT_ENTITY_TYPES.approvalRequest,
      entityIdParam: 'id',
      skipAutoRecord: true,
    });
  });

  it('keeps attachment and user mutations on the same resource/action catalog', () => {
    const attachmentPolicy = Reflect.getMetadata(POLICY_KEY, AttachmentsController.prototype.link);
    const attachmentAudit = Reflect.getMetadata(AUDIT_ACTION_KEY, AttachmentsController.prototype.link);
    const userPolicy = Reflect.getMetadata(POLICY_KEY, UsersController.prototype.updateRoles);
    const userAudit = Reflect.getMetadata(AUDIT_ACTION_KEY, UsersController.prototype.updateRoles);

    expect(attachmentPolicy).toEqual({
      resource: POLICY_RESOURCES.attachments,
      action: POLICY_ACTIONS.update,
    });
    expect(attachmentAudit).toMatchObject({
      action: CORE_MUTATION_ACTIONS.attachmentLink,
      entityType: AUDIT_ENTITY_TYPES.attachment,
    });

    expect(userPolicy).toEqual({
      resource: POLICY_RESOURCES.users,
      action: POLICY_ACTIONS.update,
    });
    expect(userAudit).toMatchObject({
      action: CORE_MUTATION_ACTIONS.userRolesUpdate,
      entityType: AUDIT_ENTITY_TYPES.user,
    });
  });

  it('uses the same policy catalog for non-core read/create routes as well', () => {
    const generatePolicy = Reflect.getMetadata(POLICY_KEY, ExportsController.prototype.generateForApprovalPacket);
    const downloadPolicy = Reflect.getMetadata(POLICY_KEY, ExportsController.prototype.download);

    expect(generatePolicy).toEqual({
      resource: POLICY_RESOURCES.exports,
      action: POLICY_ACTIONS.create,
    });
    expect(downloadPolicy).toEqual({
      resource: POLICY_RESOURCES.exports,
      action: POLICY_ACTIONS.read,
    });
  });
});
