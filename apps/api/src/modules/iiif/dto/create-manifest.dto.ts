import { IsArray, IsOptional, IsString } from 'class-validator';

export class CreateIiifManifestDto {
  @IsOptional() @IsString() organizationId?: string;
  @IsString() labelAr!: string;
  @IsOptional() @IsString() labelEn?: string;

  // Attachments to include as canvases (images/PDFs primarily)
  @IsArray() attachmentIds!: string[];

  // Optional searchable text to attach to items (for IIIF Content Search)
  @IsOptional() @IsString() fulltextAr?: string;
}
