import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RenderController } from './render.controller';
import { findRepoRootSync } from '@madar/object-store';
import { resolve } from 'node:path';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [resolve(process.cwd(), '.env'), resolve(findRepoRootSync(), '.env')],
    }),
  ],
  controllers: [RenderController],
})
export class AppModule {}
