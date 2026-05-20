import { Body, Controller, Get, Header, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import { IiifService } from './iiif.service';
import { CreateIiifManifestDto } from './dto/create-manifest.dto';

@ApiTags('iiif')
@ApiBearerAuth()
@Controller('iiif')
export class IiifController {
  constructor(private readonly service: IiifService) {}

  @Roles('viewer', 'analyst', 'curator', 'content_editor', 'project_manager', 'org_admin', 'super_admin')
  @Get('manifests')
  list(@Query('organizationId') organizationId?: string) {
    return this.service.list(organizationId);
  }

  @Roles('curator', 'content_editor', 'project_manager', 'org_admin', 'super_admin')
  @Post('manifests')
  create(@Body() dto: CreateIiifManifestDto) {
    return this.service.create({
      organizationId: dto.organizationId,
      labelAr: dto.labelAr,
      labelEn: dto.labelEn,
      attachmentIds: dto.attachmentIds,
      fulltextAr: dto.fulltextAr,
    });
  }

  // IIIF Presentation 3 Manifest
  @Roles('viewer', 'analyst', 'curator', 'content_editor', 'project_manager', 'org_admin', 'super_admin')
  @Get('manifests/:id')
  getPresentation(@Param('id') id: string) {
    return this.service.buildPresentationManifest(id);
  }

  // Convenience alias used by many IIIF viewers
  @Roles('viewer', 'analyst', 'curator', 'content_editor', 'project_manager', 'org_admin', 'super_admin')
  @Get('manifests/:id/manifest.json')
  @Header('Content-Type', 'application/ld+json; profile="http://iiif.io/api/presentation/3/context.json"')
  getPresentationJson(@Param('id') id: string) {
    return this.service.buildPresentationManifest(id);
  }

  // IIIF Content Search
  @Roles('viewer', 'analyst', 'curator', 'content_editor', 'project_manager', 'org_admin', 'super_admin')
  @Get('manifests/:id/search')
  search(@Param('id') id: string, @Query('q') q: string) {
    return this.service.contentSearch(id, q);
  }
}
