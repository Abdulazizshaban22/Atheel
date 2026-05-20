import { Module } from '@nestjs/common';
import { AttachmentsModule } from '../attachments/attachments.module';
import { ContentCredentialsController } from './content-credentials.controller';
import { ContentCredentialsService } from './content-credentials.service';

@Module({
  imports: [AttachmentsModule],
  controllers: [ContentCredentialsController],
  providers: [ContentCredentialsService],
  exports: [ContentCredentialsService],
})
export class ContentCredentialsModule {}
