import { Module } from '@nestjs/common';
import { IiifController } from './iiif.controller';
import { IiifService } from './iiif.service';

@Module({
  controllers: [IiifController],
  providers: [IiifService],
  exports: [IiifService],
})
export class IiifModule {}
