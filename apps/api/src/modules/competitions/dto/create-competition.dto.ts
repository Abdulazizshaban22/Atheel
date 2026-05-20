import { IsOptional, IsString, IsDateString } from 'class-validator';

export class CreateCompetitionDto {
  @IsOptional() @IsString() organizationId?: string;
  @IsOptional() @IsString() projectId?: string;
  @IsString() titleAr!: string;
  @IsOptional() @IsString() code?: string;
  @IsOptional() @IsDateString() dueAt?: string;
  @IsOptional() metaJson?: any;
  @IsOptional() @IsString() sourceSignalId?: string;
}
