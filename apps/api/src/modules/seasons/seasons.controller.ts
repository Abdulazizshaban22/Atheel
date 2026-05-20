import { Body, Controller, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { RequestUser } from '../auth/interfaces/request-user.interface';
import { GenerateSaudiSeasonDto } from './dto/generate-season.dto';
import { GenerateSaudiSeasonProgramsDto } from './dto/generate-season-programs.dto';
import { SeasonsService } from './seasons.service';

@ApiTags('seasons')
@ApiBearerAuth()
@Controller('seasons')
export class SeasonsController {
  constructor(private readonly seasons: SeasonsService) {}

  @Roles('analyst','curator','content_editor','project_manager','org_admin','super_admin')
  @Post('generate')
  generate(@Body() dto: GenerateSaudiSeasonDto, @CurrentUser() user: RequestUser) {
    return this.seasons.generate(dto, user);
  }

  @Roles('project_manager','org_admin','super_admin')
  @Post('generate-programs')
  generatePrograms(@Body() dto: GenerateSaudiSeasonProgramsDto, @CurrentUser() user: RequestUser) {
    return this.seasons.generatePrograms(dto, user);
  }
}
