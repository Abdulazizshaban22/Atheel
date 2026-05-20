import { Module } from '@nestjs/common';
import { PrismaModule } from '@madar/db';
import { PlatformRuntimeService } from '../../common/runtime/platform-runtime.service';
import { QueueModule } from '../queue/queue.module';
import { MetricsModule } from '../metrics/metrics.module';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';

@Module({
  imports: [PrismaModule, QueueModule, MetricsModule],
  controllers: [HealthController],
  providers: [PlatformRuntimeService, HealthService],
})
export class HealthModule {}
