import { Module } from '@nestjs/common';
import { PrismaModule } from '@madar/db';
import { AttachmentsModule } from '../attachments/attachments.module';
import { HeritageController } from './heritage.controller';
import { HeritageService } from './heritage.service';

@Module({
  imports: [PrismaModule, AttachmentsModule],
  controllers: [HeritageController],
  providers: [HeritageService],
  exports: [HeritageService],
})
export class HeritageModule {}
