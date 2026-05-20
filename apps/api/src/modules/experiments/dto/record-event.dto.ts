import { IsObject, IsOptional, IsString } from 'class-validator';

export class RecordExperimentEventDto {
  @IsString() variantKey!: string;
  @IsString() kind!: string; // e.g. view, dwell, satisfaction, completion
  @IsOptional() @IsObject() metricsJson?: any; // JSON
  @IsOptional() @IsString() userId?: string;
}
