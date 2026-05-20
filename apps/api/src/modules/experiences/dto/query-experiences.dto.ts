import { IsIn, IsOptional, IsString } from 'class-validator';

export class QueryExperiencesDto {
  @IsOptional() @IsString() projectId?: string;
  @IsOptional() @IsString() q?: string;
  @IsOptional() @IsIn(['museum','route','event','exhibition','food_culture']) experienceType?:
    'museum'|'route'|'event'|'exhibition'|'food_culture';
  @IsOptional() @IsIn(['draft','published','archived']) publishStatus?: 'draft'|'published'|'archived';
}
