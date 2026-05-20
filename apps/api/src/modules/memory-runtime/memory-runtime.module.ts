import { Module } from '@nestjs/common';
import { MemoryRuntimeController } from './memory-runtime.controller';
import { MemoryRuntimeService } from './memory-runtime.service';

@Module({ controllers: [MemoryRuntimeController], providers: [MemoryRuntimeService], exports: [MemoryRuntimeService] })
export class MemoryRuntimeModule {}
