import { Module } from '@nestjs/common';
import { PrismaModule } from '@madar/db';
import { PublicHeritageController } from './public-heritage.controller';
import { PublicHeritageService } from './public-heritage.service';

@Module({
  imports: [PrismaModule],
  controllers: [PublicHeritageController],
  providers: [PublicHeritageService],
  exports: [PublicHeritageService],
})
export class PublicHeritageModule {}
