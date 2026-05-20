import { Module } from '@nestjs/common';
import { IotController } from './iot.controller';
import { IotService } from './iot.service';
import { TwinModule } from '../twin/twin.module';
import { PrismaModule } from '@madar/db';

@Module({
  controllers: [IotController],
  providers: [IotService],
  exports: [IotService],
})
export class IotModule {}
