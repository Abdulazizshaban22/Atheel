import { Module } from '@nestjs/common';
import { RealtimeService } from './realtime.service';
import { ExecutionsGateway } from './executions.gateway';

@Module({
  providers: [RealtimeService, ExecutionsGateway],
  exports: [RealtimeService],
})
export class RealtimeModule {}
