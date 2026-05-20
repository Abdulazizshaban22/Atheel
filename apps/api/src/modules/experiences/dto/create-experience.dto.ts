import { IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateExperienceDto {
  @IsString() projectId!: string;
  @IsString() titleAr!: string;
  @IsIn(['museum','route','event','exhibition','food_culture']) experienceType!:
    'museum'|'route'|'event'|'exhibition'|'food_culture';
  @IsInt() @Min(5) durationMinutesDefault!: number;
  @IsOptional() @IsIn(['draft','published','archived']) publishStatus?: 'draft' | 'published' | 'archived';
}
