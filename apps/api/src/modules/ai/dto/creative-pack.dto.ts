import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreativePackDto {
  @IsString() brief!: string;
  @IsOptional() @IsString() organizationId?: string;
  @IsOptional() @IsString() projectId?: string;
  @IsOptional() @IsString() providerId?: string;
  @IsOptional() @IsInt() @Min(1) @Max(12) conceptsCount?: number;
  @IsOptional() @IsString() audience?: string;
  @IsOptional() @IsString() tone?: string;
  @IsOptional() @IsString() constraints?: string;
  @IsOptional() @IsString() outputLanguage?: 'ar' | 'en';
}
