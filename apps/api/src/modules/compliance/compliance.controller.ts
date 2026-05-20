import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { RequestUser } from '../auth/interfaces/request-user.interface';
import { ComplianceService } from './compliance.service';
import { GenerateKsaEventLicensingChecklistDto } from './dto/generate-ksa-licensing.dto';
import { RunTenantHardeningCheckDto } from './dto/run-tenant-hardening-check.dto';

@ApiTags('compliance')
@ApiBearerAuth()
@Controller('compliance')
export class ComplianceController {
  constructor(private readonly service: ComplianceService) {}

  @Roles('viewer','analyst','curator','content_editor','project_manager','org_admin','super_admin')
  @Get('checklists')
  list(
    @Query('organizationId') organizationId: string,
    @Query('subjectType') subjectType: string,
    @Query('subjectId') subjectId: string,
    @Query('status') status: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.listChecklists({ organizationId, subjectType, subjectId, status }, user);
  }

  @Roles('viewer','analyst','curator','content_editor','project_manager','org_admin','super_admin')
  @Get('checklists/:id')
  get(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.service.getChecklist(id, user);
  }

  @Roles('analyst','curator','content_editor','project_manager','org_admin','super_admin')
  @Patch('checklists/:checklistId/items/:itemId')
  setItemStatus(
    @Param('checklistId') checklistId: string,
    @Param('itemId') itemId: string,
    @Query('status') status: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.setItemStatus(checklistId, itemId, status, user);
  }

  @Roles('org_admin','super_admin')
  @Get('profiles')
  profiles(@Query('organizationId') organizationId: string, @CurrentUser() user: RequestUser) {
    return this.service.listReadinessProfiles(organizationId, user);
  }

  @Roles('org_admin','super_admin')
  @Get('ai/trust-reports')
  aiTrustReports(@Query('organizationId') organizationId: string, @CurrentUser() user: RequestUser) {
    return this.service.listAiTrustReports(organizationId, user);
  }

  @Roles('org_admin','super_admin')
  @Post('tenants/:tenantId/hardening/check')
  hardeningCheck(@Param('tenantId') tenantId: string, @Body() dto: RunTenantHardeningCheckDto, @CurrentUser() user: RequestUser) {
    return this.service.runTenantHardeningCheck(tenantId, dto as any, user);
  }

  @Roles('analyst','curator','content_editor','project_manager','org_admin','super_admin')
  @Post('checklists/generate/ksa-event-licensing')
  generateKsaLicensing(@Body() dto: GenerateKsaEventLicensingChecklistDto, @CurrentUser() user: RequestUser) {
    return this.service.generateKsaEventLicensingChecklist(dto as any, user);
  }
}
