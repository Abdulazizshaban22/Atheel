import { Module } from '@nestjs/common';
import { OperationalEventsController } from './operational-events.controller';
import { OperationalEventsService } from './operational-events.service';

@Module({
  controllers: [OperationalEventsController],
  providers: [OperationalEventsService],
  exports: [OperationalEventsService],
})
export class OperationalEventsModule {}
