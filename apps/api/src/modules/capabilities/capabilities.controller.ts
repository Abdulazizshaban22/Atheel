import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CapabilitiesService } from './capabilities.service';
import { Policy } from '../auth/decorators/policy.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { RequestUser } from '../auth/interfaces/request-user.interface';
import { SetCapabilityDto } from './dto/set-capability.dto';
import { AssignEditionDto } from './dto/assign-edition.dto';
import { POLICY_ACTIONS, POLICY_RESOURCES } from '../../common/contracts/resource-action.catalog';

@ApiTags('capabilities')
@ApiBearerAuth()
@Controller('capabilities')
export class CapabilitiesController {
  constructor(private readonly service: CapabilitiesService) {}

  @Policy(POLICY_RESOURCES.capabilities, POLICY_ACTIONS.read)
  @Get('catalog')
  catalog() {
    return this.service.catalog();
  }

  @Policy(POLICY_RESOURCES.capabilities, POLICY_ACTIONS.read)
  @Get('me')
  listForActiveOrg(@CurrentUser() user: RequestUser) {
    const orgId = String(user?.activeOrgId || '');
    return this.service.listForOrg(orgId);
  }

  @Policy(POLICY_RESOURCES.capabilities, POLICY_ACTIONS.read)
  @Get('editions')
  editions() {
    return this.service.listEditions();
  }

  @Policy(POLICY_RESOURCES.capabilities, POLICY_ACTIONS.read)
  @Get('editions/:id/capabilities')
  editionCapabilities(@Param('id') id: string) {
    return this.service.getEditionCapabilities(id);
  }

  @Policy(POLICY_RESOURCES.capabilities, POLICY_ACTIONS.update)
  @Post('organizations/:organizationId/edition')
  assignEdition(@Param('organizationId') organizationId: string, @Body() dto: AssignEditionDto, @CurrentUser() user: RequestUser) {
    return this.service.assignEdition(organizationId, dto, user?.sub || null);
  }

  @Policy(POLICY_RESOURCES.capabilities, POLICY_ACTIONS.update)
  @Post('set')
  setForActiveOrg(@Body() dto: SetCapabilityDto, @CurrentUser() user: RequestUser) {
    const orgId = String(user?.activeOrgId || '');
    return this.service.setForOrg(orgId, dto, user?.sub || null);
  }
}
