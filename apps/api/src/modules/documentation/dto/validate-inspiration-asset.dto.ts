import { IsOptional, IsString } from 'class-validator';

export class ValidateInspirationAssetDto {
  @IsOptional()
  @IsString()
  assetId?: string;

  @IsOptional()
  @IsString()
  titleAr?: string;

  @IsOptional()
  @IsString()
  url?: string;

  @IsOptional()
  @IsString()
  sourceId?: string;

  @IsOptional()
  @IsString()
  citationId?: string;

  @IsOptional()
  @IsString()
  notesAr?: string;
}
