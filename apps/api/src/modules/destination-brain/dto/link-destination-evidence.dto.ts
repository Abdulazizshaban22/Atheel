import { IsObject, IsOptional, IsString, MaxLength } from "class-validator";

export class LinkDestinationEvidenceDto {
  @IsString()
  destinationId!: string;

  @IsString()
  documentId!: string;

  @IsOptional()
  @IsString()
  chunkId?: string;

  @IsString()
  @MaxLength(80)
  linkType!: string;

  @IsOptional()
  @IsString()
  noteAr?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
