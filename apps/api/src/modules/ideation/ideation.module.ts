import { Module } from '@nestjs/common';
import { PrismaModule } from '@madar/db';
import { IdeationController } from './ideation.controller';
import { IdeationService } from './ideation.service';

@Module({
  imports: [PrismaModule],
  controllers: [IdeationController],
  providers: [IdeationService],
})
export class IdeationModule {}
