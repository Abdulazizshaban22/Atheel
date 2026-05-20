import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { RequestUser } from '../auth/interfaces/request-user.interface';
import { HeritageService } from './heritage.service';
import { CreateHeritageAssetDto } from './dto/create-heritage-asset.dto';
import { UpdateHeritageAssetDto } from './dto/update-heritage-asset.dto';
import { CreateHeritageAccessProtocolDto } from './dto/create-access-protocol.dto';
import { UpdateHeritageSafetyProfileDto } from './dto/update-heritage-safety-profile.dto';
import { RunHeritageSafetyAssessmentDto } from './dto/run-heritage-safety-assessment.dto';

@ApiTags('heritage')
@ApiBearerAuth()
@Controller('heritage')
export class HeritageController {
  constructor(private readonly heritage: HeritageService) {}

  @Roles('viewer','analyst','curator','content_editor','project_manager','org_admin','super_admin')
  @Get('assets')
  list(@Query('organizationId') organizationId: string, @CurrentUser() user: RequestUser) {
    return this.heritage.list({ organizationId }, user);
  }

  @Roles('viewer','analyst','curator','content_editor','project_manager','org_admin','super_admin')
  @Get('assets/:id')
  get(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.heritage.get(id, user);
  }

  @Roles('curator','content_editor','project_manager','org_admin','super_admin')
  @Post('assets')
  create(@Body() dto: CreateHeritageAssetDto, @CurrentUser() user: RequestUser) {
    return this.heritage.create(dto, user);
  }

  @Roles('curator','content_editor','project_manager','org_admin','super_admin')
  @Patch('assets/:id')
  update(@Param('id') id: string, @Body() dto: UpdateHeritageAssetDto, @CurrentUser() user: RequestUser) {
    return this.heritage.update(id, dto, user);
  }


  @Roles('viewer','analyst','curator','content_editor','project_manager','org_admin','super_admin')
  @Get('assets/:id/safety-profile')
  getSafetyProfile(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.heritage.getSafetyProfile(id, user);
  }

  @Roles('curator','content_editor','project_manager','org_admin','super_admin')
  @Post('assets/:id/safety-profile')
  updateSafetyProfile(@Param('id') id: string, @Body() dto: UpdateHeritageSafetyProfileDto, @CurrentUser() user: RequestUser) {
    return this.heritage.updateSafetyProfile(id, dto, user);
  }

  @Roles('viewer','analyst','curator','content_editor','project_manager','org_admin','super_admin')
  @Post('assets/:id/assessments/run')
  runSafetyAssessment(@Param('id') id: string, @Body() dto: RunHeritageSafetyAssessmentDto, @CurrentUser() user: RequestUser) {
    return this.heritage.runSafetyAssessment(id, dto, user);
  }

  @Roles('org_admin','super_admin')
  @Post('assets/:id/protocols')
  addProtocol(@Param('id') id: string, @Body() dto: CreateHeritageAccessProtocolDto, @CurrentUser() user: RequestUser) {
    return this.heritage.addProtocol(id, dto, user);
  }
}
