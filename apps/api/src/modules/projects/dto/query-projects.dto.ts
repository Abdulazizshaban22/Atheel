import { IsIn, IsOptional, IsString } from 'class-validator';

export class QueryProjectsDto {
  @IsOptional() @IsString() organizationId?: string;
  @IsOptional() @IsString() q?: string;
  @IsOptional() @IsIn(['draft','planning','in_progress','paused','completed','archived']) status?:
    'draft'|'planning'|'in_progress'|'paused'|'completed'|'archived';
}
