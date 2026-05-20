import { Module } from '@nestjs/common';
import { PrismaModule } from '@madar/db';
import { HeritageMemoryController } from './heritage-memory.controller';
import { HeritageMemoryService } from './heritage-memory.service';

@Module({
  imports: [PrismaModule],
  controllers: [HeritageMemoryController],
  providers: [HeritageMemoryService],
})
export class HeritageMemoryModule {}
