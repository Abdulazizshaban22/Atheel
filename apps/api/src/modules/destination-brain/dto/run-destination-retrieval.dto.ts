import { IsOptional, IsString, IsNumber, MaxLength } from 'class-validator';
export class RunDestinationRetrievalDto {
  @IsString()
  @MaxLength(5000)
  query!: string;
  @IsOptional()
  @IsString()
  organizationId?: string;
  city?: string;
  destinationType?: string;
  languageCode?: 'ar' | 'en';
  @IsOptional()
  @IsNumber()
  topK?: number;
}
