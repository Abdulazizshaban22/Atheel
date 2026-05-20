import { Module } from '@nestjs/common';
import { PrismaModule } from '@madar/db';
import { AgentRuntimeController } from './agent-runtime.controller';
import { AgentRuntimeService } from './agent-runtime.service';

@Module({ imports: [PrismaModule], controllers: [AgentRuntimeController], providers: [AgentRuntimeService], exports: [AgentRuntimeService] })
export class AgentRuntimeModule {}
