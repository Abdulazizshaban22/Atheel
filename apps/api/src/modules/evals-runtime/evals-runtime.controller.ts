import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { ApiTags } from '@nestjs/swagger';
import { EvalsRuntimeService } from './evals-runtime.service';

@ApiTags('evals-runtime')
@ApiBearerAuth()
@Controller('evals')
export class EvalsRuntimeController {
  constructor(private readonly service: EvalsRuntimeService) {}

  @Post('run')
  run(@Body() dto: any) {
    return this.service.run(dto);
  }

  @Post('run/domain/:domain')
  runDomain(@Param('domain') domain: string, @Body() dto: any) {
    return this.service.run({ ...dto, domain });
  }

  @Get('benchmarks/:domain')
  benchmark(@Param('domain') domain: string) {
    return this.service.getBenchmark(domain);
  }

  @Get('benchmarks')
  benchmarksOverview() {
    return this.service.benchmarkOverview();
  }

  @Get('regressions/latest')
  latest() {
    return this.service.latestRegression();
  }

  @Get('regressions/domain/:domain')
  regressionsByDomain(@Param('domain') domain: string) {
    return this.service.regressionByDomain(domain);
  }

  @Get('quality/overview')
  qualityOverview() {
    return this.service.qualityOverview();
  }

  @Get('quality/threshold-breaches')
  thresholdBreaches() {
    return this.service.thresholdBreaches();
  }
}
