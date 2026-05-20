import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { OfficialService } from './official.service';

@Controller('official')
export class OfficialController {
  constructor(private readonly official: OfficialService) {}

  @Post('seed')
  seed(@Body() body: any) {
    return this.official.seedOfficialPackages({ organizationId: body.organizationId || null });
  }

  @Get('items')
  list(@Query('organizationId') organizationId?: string, @Query('sourceKind') sourceKind?: string) {
    return this.official.list({ organizationId, sourceKind });
  }

  @Post('generate-signals')
  generateSignals(@Body() body: any) {
    return this.official.generateSignalsFromOfficial({ organizationId: body.organizationId || null, projectId: body.projectId || null });
  }
}
