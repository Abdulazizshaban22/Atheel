import { Module } from '@nestjs/common';
import { CultureController } from './culture.controller';
import { CultureService } from './culture.service';
import { PrismaModule } from '@madar/db';

@Module({
  imports: [PrismaModule],
  controllers: [CultureController],
  providers: [CultureService],
})
export class CultureModule {}
