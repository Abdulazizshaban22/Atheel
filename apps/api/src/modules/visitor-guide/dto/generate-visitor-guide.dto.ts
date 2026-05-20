import { IsIn, IsOptional, IsString } from 'class-validator';

export class GenerateVisitorGuideDto {
  @IsString()
  experienceId!: string;

  @IsOptional()
  @IsString()
  organizationId?: string;

  @IsOptional()
  @IsString()
  projectId?: string;

  @IsOptional()
  @IsIn(['family', 'student', 'expert', 'tourist'])
  persona?: 'family' | 'student' | 'expert' | 'tourist';

  @IsOptional()
  @IsString()
  languageCode?: string;
}
