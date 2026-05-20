import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { RequestUser } from '../auth/interfaces/request-user.interface';
import { assertOrgAccess } from '../../common/access';
import { OperationalEventsService } from './operational-events.service';
import { QueryOperationalEventsDto } from './dto/query-operational-events.dto';

@ApiTags('operational-events')
@ApiBearerAuth()
@Controller('operational-events')
export class OperationalEventsController {
  constructor(private readonly service: OperationalEventsService) {}

  @Roles('org_admin', 'super_admin')
  @Get()
  list(@Query() query: QueryOperationalEventsDto, @CurrentUser() user: RequestUser) {
    if (query.organizationId) assertOrgAccess(user, query.organizationId);
    return this.service.list(query);
  }
}
