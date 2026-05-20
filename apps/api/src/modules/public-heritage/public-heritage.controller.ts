import { Controller, Get, Header, NotFoundException, Param, Query, StreamableFile } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PublicHeritageService } from './public-heritage.service';
import { createReadStream } from 'node:fs';
import { resolve, sep } from 'node:path';
import { PrismaService } from '@madar/db';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('public-heritage')
@Controller('public/heritage')
@Public()
export class PublicHeritageController {
  constructor(
    private readonly service: PublicHeritageService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('search')
  search(
    @Query('q') q?: string,
    @Query('region') region?: string,
    @Query('assetType') assetType?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.service.search({ q, region, assetType, page: Number(page || 1), pageSize: Number(pageSize || 20) });
  }

  @Get('assets/:slug')
  get(@Param('slug') slug: string) {
    return this.service.getBySlug(slug);
  }

  // IIIF Presentation 3 manifest for the public asset
  @Get('assets/:slug/manifest.json')
  @Header('Content-Type', 'application/ld+json; profile="http://iiif.io/api/presentation/3/context.json"')
  manifest(@Param('slug') slug: string) {
    return this.service.getManifestBySlug(slug);
  }

  // Public download for attachments linked to a published public heritage asset
  @Get('assets/:slug/attachments/:attachmentId/download')
  async downloadAttachment(
    @Param('slug') slug: string,
    @Param('attachmentId') attachmentId: string,
  ): Promise<StreamableFile> {
    const assetRes: any = await this.service.getBySlug(slug);
    const asset = assetRes?.asset;
    if (!asset) throw new NotFoundException('Heritage asset not found');

    const att: any = await (this.prisma as Record<string, unknown>).attachment.findUnique({ where: { id: String(attachmentId) } }).catch(() => null);
    if (!att) throw new NotFoundException('Attachment not found');

    // Ensure the attachment is linked to this asset
    if (String(att.entityType) !== 'heritage_asset' || String(att.entityId) !== String(asset.id)) {
      throw new NotFoundException('Attachment not linked');
    }

    const uploadDir = process.env.ATHEEL_UPLOAD_DIR || 'runtime_uploads';
    const absBase = resolve(process.cwd(), uploadDir);
    const absPath = resolve(process.cwd(), String(att.storagePath || ''));
    if (!(absPath === absBase || absPath.startsWith(absBase + sep))) {
      throw new NotFoundException('Invalid attachment path');
    }

    const stream = createReadStream(absPath);
    return new StreamableFile(stream, {
      type: att.mimeType || 'application/octet-stream',
      disposition: `inline; filename*=UTF-8''${encodeURIComponent(att.originalName || att.id)}`,
    });
  }

  // IIIF Content Search API response (AnnotationPage)
  @Get('assets/:slug/search')
  searchWithin(@Param('slug') slug: string, @Query('q') q: string) {
    return this.service.searchWithinAsset(slug, q);
  }
}
