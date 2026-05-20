import { Global, Module } from '@nestjs/common';
import { QueueService } from './queue.service';
import { QueueRuntimeRegistryService } from '../../common/runtime/queue-runtime-registry.service';
import { AsyncDiagnosticsRegistryService } from '../../common/runtime/async-diagnostics-registry.service';

@Global()
@Module({
  providers: [QueueService, QueueRuntimeRegistryService, AsyncDiagnosticsRegistryService],
  exports: [QueueService, QueueRuntimeRegistryService, AsyncDiagnosticsRegistryService],
})
export class QueueModule {}
