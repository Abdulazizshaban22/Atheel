import { Module } from '@nestjs/common';
import { PrismaModule } from '@madar/db';
import { VaultController } from './vault.controller';
import { VaultService } from './vault.service';

@Module({
  imports: [PrismaModule],
  controllers: [VaultController],
  providers: [VaultService],
})
export class VaultModule {}
