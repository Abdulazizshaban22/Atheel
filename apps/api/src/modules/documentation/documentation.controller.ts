import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { DocumentationService } from './documentation.service';
import { ValidateInspirationAssetDto } from './dto/validate-inspiration-asset.dto';

@ApiBearerAuth()
@Controller('documentation')
export class DocumentationController {
  constructor(private readonly docs: DocumentationService) {}

  @Get('rules')
  @Public()
  rules() {
    return this.docs.rules();
  }

  @Post('validate/inspiration-asset')
  validateAsset(@Body() dto: ValidateInspirationAssetDto) {
    return this.docs.validateInspirationAsset(dto || {} as any);
  }

  @Get('checks')
  @Public()
  checks(@Query('entityType') entityType?: string, @Query('entityId') entityId?: string) {
    return this.docs.listChecks(entityType, entityId);
  }

  @Get('routes-inventory')
  @Roles('super_admin')
  routesInventory() {
    return this.docs.routesInventory();
  }
}
