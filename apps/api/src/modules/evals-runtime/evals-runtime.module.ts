import { Module } from '@nestjs/common';
import { EvalsRuntimeController } from './evals-runtime.controller';
import { EvalsRuntimeService } from './evals-runtime.service';

@Module({ controllers: [EvalsRuntimeController], providers: [EvalsRuntimeService], exports: [EvalsRuntimeService] })
export class EvalsRuntimeModule {}
