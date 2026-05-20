import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CoreMutationRoute } from '../../common/contracts/core-mutation-route.decorator';
import { AUDIT_ENTITY_TYPES, CORE_MUTATION_ACTIONS, POLICY_ACTIONS, POLICY_RESOURCES } from '../../common/contracts/resource-action.catalog';
import { Policy } from '../auth/decorators/policy.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { UsersService } from './users.service';
import { QueryUsersDto } from './dto/query-users.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import type { PlatformRole } from '../auth/constants';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly service: UsersService) {}

  @Roles('org_admin', 'super_admin')
  @Policy(POLICY_RESOURCES.users, POLICY_ACTIONS.read)
  @Get()
  findAll(@Query() query: QueryUsersDto) { return this.service.findAll(query); }

  @Roles('org_admin', 'super_admin')
  @Policy(POLICY_RESOURCES.users, POLICY_ACTIONS.read)
  @Get('roles/catalog')
  rolesCatalog() { return { roles: this.service.listRolesCatalog() }; }

  @Roles('org_admin', 'super_admin')
  @CoreMutationRoute({
    policyResource: POLICY_RESOURCES.users,
    policyAction: POLICY_ACTIONS.create,
    auditAction: CORE_MUTATION_ACTIONS.userCreate,
    entityType: AUDIT_ENTITY_TYPES.user,
    organizationIdBodyField: 'organizationId',
    message: 'User created',
  })
  @Post()
  create(@Body() dto: CreateUserDto) { return this.service.create(dto); }

  @Roles('org_admin', 'super_admin')
  @CoreMutationRoute({
    policyResource: POLICY_RESOURCES.users,
    policyAction: POLICY_ACTIONS.update,
    auditAction: CORE_MUTATION_ACTIONS.userUpdate,
    entityType: AUDIT_ENTITY_TYPES.user,
    entityIdParam: 'id',
    message: 'User updated',
  })
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateUserDto) { return this.service.update(id, dto); }

  @Roles('org_admin', 'super_admin')
  @CoreMutationRoute({
    policyResource: POLICY_RESOURCES.users,
    policyAction: POLICY_ACTIONS.update,
    auditAction: CORE_MUTATION_ACTIONS.userRolesUpdate,
    entityType: AUDIT_ENTITY_TYPES.user,
    entityIdParam: 'id',
    message: 'User roles updated',
  })
  @Patch(':id/roles')
  updateRoles(@Param('id') id: string, @Body() body: { roles: PlatformRole[]; orgIds?: string[] }) {
    return this.service.updateRoles(id, body.roles, body.orgIds);
  }

  @Roles('super_admin')
  @CoreMutationRoute({
    policyResource: POLICY_RESOURCES.users,
    policyAction: POLICY_ACTIONS.delete,
    auditAction: CORE_MUTATION_ACTIONS.userDelete,
    entityType: AUDIT_ENTITY_TYPES.user,
    entityIdParam: 'id',
    message: 'User removed',
  })
  @Delete(':id')
  remove(@Param('id') id: string) { return this.service.remove(id); }
}
