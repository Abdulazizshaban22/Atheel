import { Module } from '@nestjs/common';
import { RetrievalRuntimeController } from './retrieval-runtime.controller';
import { RetrievalRuntimeService } from './retrieval-runtime.service';

@Module({ controllers: [RetrievalRuntimeController], providers: [RetrievalRuntimeService], exports: [RetrievalRuntimeService] })
export class RetrievalRuntimeModule {}
