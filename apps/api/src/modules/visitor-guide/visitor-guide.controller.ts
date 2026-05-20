import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { Public } from '../auth/decorators/public.decorator';
import { VisitorGuideService } from './visitor-guide.service';
import { GenerateVisitorGuideDto } from './dto/generate-visitor-guide.dto';
import { CreateVisitorProfileDto } from './dto/create-visitor-profile.dto';
import { RecommendVisitorExperiencesDto } from './dto/recommend-visitor-experiences.dto';

@Controller('visitor-guide')
export class VisitorGuideController {
  constructor(private readonly guide: VisitorGuideService) {}

  @Get()
  @Public()
  list(@Query('experienceId') experienceId?: string) {
    return this.guide.list(experienceId);
  }

  @Post('generate')
  generate(@Body() dto: GenerateVisitorGuideDto) {
    return this.guide.generate(dto);
  }

  @Post('profiles')
  createProfile(@Body() dto: CreateVisitorProfileDto) {
    return this.guide.createVisitorProfile(dto);
  }

  @Get('segments')
  segments(@Query('organizationId') organizationId?: string) {
    return this.guide.listVisitorSegments(organizationId);
  }

  @Post('recommend')
  recommend(@Body() dto: RecommendVisitorExperiencesDto) {
    return this.guide.recommendExperiences(dto);
  }

  @Get('profiles/:id/history')
  history(@Param('id') id: string) {
    return this.guide.visitorHistory(id);
  }

  @Get(':id')
  @Public()
  get(@Param('id') id: string) {
    return this.guide.get(id);
  }
}
