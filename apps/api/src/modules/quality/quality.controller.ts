import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { QualityService } from './quality.service';

@Controller('quality')
export class QualityController {
  constructor(private readonly quality: QualityService) {}

  @Post('authenticity/assess')
  assessAuthenticity(@Body() body: any) {
    return this.quality.assessAuthenticity(body);
  }

  @Get('authenticity')
  listAuthenticity(@Query('organizationId') organizationId?: string, @Query('subjectType') subjectType?: string) {
    return this.quality.listAuthenticity({ organizationId, subjectType });
  }

  @Post('evidence/check')
  checkEvidence(@Body() body: any) {
    return this.quality.checkEvidence(body);
  }

  @Get('evidence')
  listEvidence(@Query('organizationId') organizationId?: string, @Query('subjectType') subjectType?: string) {
    return this.quality.listEvidence({ organizationId, subjectType });
  }

  @Get('rag-metrics')
  listRagMetrics(@Query('organizationId') organizationId?: string, @Query('limit') limit?: string) {
    return this.quality.listRagMetrics({ organizationId, limit: limit ? Number(limit) : undefined });
  }

  @Get('rag-metrics/summary')
  ragSummary(@Query('organizationId') organizationId?: string) {
    return this.quality.ragMetricsSummary({ organizationId });
  }
}
