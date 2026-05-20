import { Module } from '@nestjs/common';
import { VisitorGuideController } from './visitor-guide.controller';
import { VisitorGuideService } from './visitor-guide.service';

@Module({
  controllers: [VisitorGuideController],
  providers: [VisitorGuideService],
})
export class VisitorGuideModule {}
