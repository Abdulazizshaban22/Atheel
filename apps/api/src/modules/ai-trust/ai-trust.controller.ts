import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import { ApiTags } from '@nestjs/swagger';
import { AiTrustService } from './ai-trust.service';
import { EvaluateAiTrustDto } from './dto/evaluate-ai-trust.dto';

@ApiTags('ai-trust')
@ApiBearerAuth()
@Controller('ai/trust')
export class AiTrustController {
  constructor(private readonly service: AiTrustService) {}

  @Post('evaluate')
  evaluate(@Body() dto: EvaluateAiTrustDto) {
    return this.service.evaluate(dto);
  }

  @Get('reports/:jobId')
  getReport(@Param('jobId') jobId: string) {
    return this.service.getReport(jobId);
  }

  @Post('human-review')
  humanReview(@Body() dto: { jobId: string; reviewer?: string; note?: string; domain?: string }) {
    return this.service.requestHumanReview(dto);
  }

  @Get('human-review')
  listHumanReviews(@Query('domain') domain?: string) {
    return this.service.listHumanReviews(domain);
  }

  @Post('human-review/:reviewId/resolve')
  resolveHumanReview(@Param('reviewId') reviewId: string, @Body() dto: { reviewer?: string; note?: string; status?: string }) {
    return this.service.resolveHumanReview(reviewId, dto);
  }

  @Get('human-review/breaches')
  humanReviewBreaches() {
    return this.service.listReviewBreaches();
  }

  @Get('human-review/queue-overview')
  queueOverview() {
    return this.service.queueOverview();
  }

  @Get('scorecards/overview')
  scorecardsOverview() {
    return this.service.scorecardOverview();
  }
}
