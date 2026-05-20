import { Module } from '@nestjs/common';
import { PrismaModule } from '@madar/db';
import { DocumentationController } from './documentation.controller';
import { DocumentationService } from './documentation.service';

@Module({
  imports: [PrismaModule],
  controllers: [DocumentationController],
  providers: [DocumentationService],
})
export class DocumentationModule {}
