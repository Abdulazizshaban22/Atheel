import { IsOptional, IsString } from 'class-validator';

export class InstantiateProgramTemplateDto {
  @IsOptional()
  @IsString()
  projectId?: string;

  @IsOptional()
  @IsString()
  organizationId?: string;
}
