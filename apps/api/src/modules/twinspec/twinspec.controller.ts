import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { Public } from '../auth/decorators/public.decorator';
import { CreateTwinSpecDto } from './dto/create-twinspec.dto';
import { PublishTwinSpecDto } from './dto/publish-twinspec.dto';
import { TwinSpecService } from './twinspec.service';

@Controller('twinspec')
export class TwinSpecController {
  constructor(private readonly svc: TwinSpecService) {}

  @Get()
  list(@Query('twinId') twinId?: string, @Query('projectId') projectId?: string, @Query('organizationId') organizationId?: string) {
    return this.svc.list({ twinId, projectId, organizationId });
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.svc.get(id);
  }

  // Compile + save TwinSpec from studio outputs (creative + operational + narrative + compliance)
  @Post()
  create(@Body() dto: CreateTwinSpecDto) {
    return this.svc.createFromStudios(dto);
  }

  // Publish TwinSpec into the Twin graph + store Scenario Pack
  @Post(':id/publish')
  publish(@Param('id') id: string, @Body() dto: PublishTwinSpecDto) {
    return this.svc.publish(id, dto);
  }
}
