import { IsArray, IsIn, IsNumber, IsObject, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateHeritageAssetDto {
  @IsOptional()
  @IsString()
  @MaxLength(300)
  titleAr?: string;

  @IsOptional()
  @IsString()
  @MaxLength(6000)
  descriptionAr?: string;

  @IsOptional()
  @IsIn(['material','immaterial','architectural'])
  assetType?: string;

  @IsOptional()
  @IsString()
  region?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @IsNumber()
  longitude?: number;

  @IsOptional()
  @IsIn(['public','researchers','internal','restricted'])
  accessLevel?: string;

  @IsOptional()
  @IsObject()
  accessPolicy?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  @IsIn(['draft','submitted','approved','published','archived'])
  status?: string;

  @IsOptional()
  @IsArray()
  attachmentIds?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(200000)
  fulltextAr?: string;

  // يسمح به فقط للمدير عبر سياسات الخدمة (وليس من الـ DTO وحده)
  @IsOptional()
  @IsString()
  @MaxLength(220)
  publicSlug?: string;
}
