import { IsInt, IsOptional, IsString, Max, Min, IsIn, IsDateString } from 'class-validator';

export class CreateProjectDto {
  @IsString() organizationId!: string;
  @IsString() code!: string;
  @IsString() nameAr!: string;
  @IsOptional() @IsIn(['draft','planning','in_progress','paused','completed','archived']) status?:
    'draft'|'planning'|'in_progress'|'paused'|'completed'|'archived';
  @IsOptional() @IsInt() @Min(0) @Max(100) progressPercent?: number;
  @IsOptional() @IsDateString() startDate?: string;
  @IsOptional() @IsDateString() endDate?: string;
}
