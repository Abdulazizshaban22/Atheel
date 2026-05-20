import { Module } from '@nestjs/common';
import { AiTrustController } from './ai-trust.controller';
import { AiTrustService } from './ai-trust.service';

@Module({ controllers: [AiTrustController], providers: [AiTrustService], exports: [AiTrustService] })
export class AiTrustModule {}
