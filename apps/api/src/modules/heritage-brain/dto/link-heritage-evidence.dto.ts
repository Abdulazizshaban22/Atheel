import { IsObject, IsOptional, IsString } from 'class-validator';

export class LinkHeritageEvidenceDto {
  @IsString()
  assetId!: string;

  @IsString()
  documentId!: string;

  @IsOptional()
  @IsString()
  chunkId?: string;

  @IsString()
  linkType!: string;

  @IsOptional()
  @IsString()
  noteAr?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
