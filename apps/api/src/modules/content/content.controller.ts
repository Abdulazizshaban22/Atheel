import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ApiResponseEnvelope } from '../../common/http/api-response-envelope.decorator';
import { CoreMutationRoute } from '../../common/contracts/core-mutation-route.decorator';
import { AUDIT_ENTITY_TYPES, CORE_MUTATION_ACTIONS, POLICY_ACTIONS, POLICY_RESOURCES } from '../../common/contracts/resource-action.catalog';
import { Policy } from '../auth/decorators/policy.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { ContentApplicationService } from './content.application-service';
import { ContentService } from './content.service';
import { CreateContentItemDto } from './dto/create-content-item.dto';
import { QueryContentItemsDto } from './dto/query-content-items.dto';
import { UpdateContentItemDto } from './dto/update-content-item.dto';

@ApiTags('content')
@ApiBearerAuth()
@Controller('content')
export class ContentController {
  constructor(
    private readonly service: ContentService,
    private readonly application: ContentApplicationService,
  ) {}

  @Roles('viewer','analyst','curator','content_editor','org_admin','super_admin')
  @Policy(POLICY_RESOURCES.content, POLICY_ACTIONS.read)
  @ApiResponseEnvelope({ kind: 'list', message: 'Content items fetched' })
  @Get()
  findAll(@Query() query: QueryContentItemsDto){ return this.service.findAll(query); }

  @Roles('viewer','analyst','curator','content_editor','org_admin','super_admin')
  @Policy(POLICY_RESOURCES.content, POLICY_ACTIONS.read)
  @ApiResponseEnvelope({ kind: 'item', message: 'Content item fetched' })
  @Get(':id')
  findOne(@Param('id') id: string){ return this.service.findOne(id); }

  @Roles('curator','content_editor','org_admin','super_admin')
  @CoreMutationRoute({
    policyResource: POLICY_RESOURCES.content,
    policyAction: POLICY_ACTIONS.create,
    auditAction: CORE_MUTATION_ACTIONS.contentCreate,
    entityType: AUDIT_ENTITY_TYPES.content,
    organizationIdBodyField: 'organizationId',
    message: 'Content item created',
    skipAutoRecord: true,
  })
  @ApiResponseEnvelope({ kind: 'mutation', message: 'Content item created' })
  @Post()
  create(@Body() dto: CreateContentItemDto){ return this.application.create(dto); }

  @Roles('curator','content_editor','org_admin','super_admin')
  @CoreMutationRoute({
    policyResource: POLICY_RESOURCES.content,
    policyAction: POLICY_ACTIONS.update,
    auditAction: CORE_MUTATION_ACTIONS.contentUpdate,
    entityType: AUDIT_ENTITY_TYPES.content,
    entityIdParam: 'id',
    message: 'Content item updated',
    skipAutoRecord: true,
  })
  @ApiResponseEnvelope({ kind: 'mutation', message: 'Content item updated' })
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateContentItemDto){ return this.application.update(id, dto); }

  @Roles('org_admin','super_admin')
  @CoreMutationRoute({
    policyResource: POLICY_RESOURCES.content,
    policyAction: POLICY_ACTIONS.delete,
    auditAction: CORE_MUTATION_ACTIONS.contentDelete,
    entityType: AUDIT_ENTITY_TYPES.content,
    entityIdParam: 'id',
    message: 'Content item deleted',
    skipAutoRecord: true,
  })
  @ApiResponseEnvelope({ kind: 'mutation', message: 'Content item deleted' })
  @Delete(':id')
  remove(@Param('id') id: string){ return this.application.remove(id); }
}
