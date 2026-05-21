import { IsOptional, IsString, IsArray, IsNumber, MaxLength } from 'class-validator';
export class SearchDomainKnowledgeDto {
  @IsOptional()
  @IsString()
  domain?: string;
  @IsString()
  @MaxLength(5000)
  query!: string;
  @IsOptional()
  @IsArray()
  tags?: string[];
  languageCode?: 'ar' | 'en';
  @IsOptional()
  @IsString()
  projectId?: string;
  @IsOptional()
  @IsString()
  organizationId?: string;
  @IsOptional()
  @IsNumber()
  topK?: number;
}
