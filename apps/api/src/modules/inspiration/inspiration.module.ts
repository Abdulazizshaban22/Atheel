import { Module } from '@nestjs/common';
import { InspirationController } from './inspiration.controller';
import { InspirationService } from './inspiration.service';
import { PrismaModule } from '@madar/db';

@Module({
  imports: [PrismaModule],
  controllers: [InspirationController],
  providers: [InspirationService],
})
export class InspirationModule {}
