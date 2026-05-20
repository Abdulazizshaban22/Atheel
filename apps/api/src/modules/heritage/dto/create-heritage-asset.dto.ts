import { IsArray, IsIn, IsNumber, IsObject, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateHeritageAssetDto {
  @IsOptional()
  @IsString()
  organizationId?: string;

  @IsString()
  @MaxLength(300)
  titleAr!: string;

  @IsOptional()
  @IsString()
  @MaxLength(6000)
  descriptionAr?: string;

  @IsString()
  @IsIn(['material','immaterial','architectural'])
  assetType!: string;

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

  // Wave48: ربط مرفقات للأصل التراثي (لا تُخزن في جدول منفصل، بل via Attachment.entityType/entityId)
  @IsOptional()
  @IsArray()
  attachmentIds?: string[];

  // Wave48: نص كامل (تفريغ/وصف موسع) لدعم البحث داخل الأصل
  @IsOptional()
  @IsString()
  @MaxLength(200000)
  fulltextAr?: string;
}
