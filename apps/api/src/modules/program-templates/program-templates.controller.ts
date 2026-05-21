import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { GenerateProgramTemplateDto } from './dto/generate-program-template.dto';
import { InstantiateProgramTemplateDto } from './dto/instantiate-program-template.dto';
import { ProgramTemplatesService } from './program-templates.service';

@ApiBearerAuth()
@Controller('program-templates')
export class ProgramTemplatesController {
  constructor(private readonly tpl: ProgramTemplatesService) {}

  @Get()
  list() {
    return this.tpl.list();
  }

  @Post('generate')
  generate(@Body() dto: GenerateProgramTemplateDto) {
    return this.tpl.generateFromIdea(dto as any);
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.tpl.get(id);
  }

  @Post(':id/instantiate')
  instantiate(@Param('id') id: string, @Body() dto: InstantiateProgramTemplateDto) {
    return this.tpl.instantiateTemplate(id, dto as any);
  }

  @Get('programs/link')
  linkHelp(@Query('ideaId') ideaId?: string) {
    return this.tpl.previewLink(ideaId);
  }
}
