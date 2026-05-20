import { IsDateString, IsInt, IsOptional, IsString, Max, Min, IsIn } from 'class-validator';

export class UpdateProjectDto {
  @IsOptional() @IsString() organizationId?: string;
  @IsOptional() @IsString() code?: string;
  @IsOptional() @IsString() nameAr?: string;
  @IsOptional() @IsIn(['draft','planning','in_progress','paused','completed','archived']) status?:
    'draft'|'planning'|'in_progress'|'paused'|'completed'|'archived';
  @IsOptional() @IsInt() @Min(0) @Max(100) progressPercent?: number;
  @IsOptional() @IsDateString() startDate?: string;
  @IsOptional() @IsDateString() endDate?: string;
}
