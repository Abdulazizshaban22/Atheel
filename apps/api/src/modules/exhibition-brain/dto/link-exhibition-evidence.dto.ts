import { IsOptional, IsString, IsObject } from 'class-validator';
export class LinkExhibitionEvidenceDto {
  exhibitId!: string;
  documentId!: string;
  @IsOptional()
  @IsString()
  chunkId?: string;
  linkType!: string;
  @IsOptional()
  @IsString()
  noteAr?: string;
@IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
