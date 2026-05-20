import { Module } from '@nestjs/common';

import { ExportsRendererService } from './exports-renderer.service';

@Module({
  providers: [ExportsRendererService],
  exports: [ExportsRendererService],
})
export class ExportsRendererModule {}
