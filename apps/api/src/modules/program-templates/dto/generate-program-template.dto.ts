import { IsOptional, IsString } from 'class-validator';

export class GenerateProgramTemplateDto {
  @IsString()
  ideaId!: string;

  @IsOptional()
  @IsString()
  organizationId?: string;

  @IsOptional()
  @IsString()
  domain?: string;
}
