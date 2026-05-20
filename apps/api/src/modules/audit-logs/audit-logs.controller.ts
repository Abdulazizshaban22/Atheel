import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { RequestUser } from '../auth/interfaces/request-user.interface';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuditLogsService } from './audit-logs.service';
import { CreateAuditLogDto } from './dto/create-audit-log.dto';
import { QueryAuditLogsDto } from './dto/query-audit-logs.dto';

@ApiTags('audit-logs')
@ApiBearerAuth()
@Controller('audit-logs')
export class AuditLogsController {
  constructor(private readonly service: AuditLogsService) {}

  @Roles('analyst', 'org_admin', 'super_admin')
  @Get()
  findAll(@Query() query: QueryAuditLogsDto) { return this.service.findAll(query); }

  @Roles('analyst', 'org_admin', 'super_admin')
  @Post()
  create(@Body() dto: CreateAuditLogDto, @CurrentUser() user: RequestUser) {
    return this.service.create(dto, user?.sub);
  }
}
