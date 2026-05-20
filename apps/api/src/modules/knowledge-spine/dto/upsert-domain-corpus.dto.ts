import { IsOptional, IsString, IsArray, IsObject, IsNumber, MaxLength } from 'class-validator';
export class UpsertDomainCorpusDto {
  domain!: string;
  titleAr!: string;
  titleEn?: string;
  descriptionAr?: string;
  taxonomyVersion?: string;
  authorityLevel?: 'core' | 'sector' | 'client';
  languages?: string[];
  @IsOptional()
  @IsArray()
  tags?: string[];
}
