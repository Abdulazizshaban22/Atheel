import { IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class UpdateExperienceDto {
  @IsOptional() @IsString() projectId?: string;
  @IsOptional() @IsString() titleAr?: string;
  @IsOptional() @IsIn(['museum','route','event','exhibition','food_culture']) experienceType?:
    'museum'|'route'|'event'|'exhibition'|'food_culture';
  @IsOptional() @IsInt() @Min(5) durationMinutesDefault?: number;
  @IsOptional() @IsIn(['draft','published','archived']) publishStatus?: 'draft' | 'published' | 'archived';
}
