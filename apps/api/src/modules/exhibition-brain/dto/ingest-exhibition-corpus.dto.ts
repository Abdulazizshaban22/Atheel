import { IsOptional, IsString, IsArray, IsObject, IsNumber, MaxLength } from 'class-validator';
export class IngestExhibitionCorpusDto {
  @IsOptional()
  @IsString()
  organizationId?: string;
  @IsOptional()
  @IsString()
  projectId?: string;
  @IsString()
  @MaxLength(5000)
  title!: string;
  @IsString()
  @MaxLength(5000)
  text!: string;
  @IsOptional()
  @IsString()
  languageCode?: string;
  @IsOptional()
  @IsArray()
  tags?: string[];
@IsOptional()
  @IsObject()
  metadata?: {
    exhibitType?: string;
    audienceSegment?: string;
    curatorialTrack?: string;
    assetType?: string;
    authorityLevel?: string;
    [key: string]: unknown;
  };
}
