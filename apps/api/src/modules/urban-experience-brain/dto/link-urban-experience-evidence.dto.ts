
import { IsObject, IsOptional, IsString } from 'class-validator';
export class LinkUrbanExperienceEvidenceDto {
  @IsString() experienceId!: string;
  @IsString() documentId!: string;
  @IsOptional() @IsString() chunkId?: string;
  @IsString() linkType!: string;
  @IsOptional() @IsString() noteAr?: string;
  @IsOptional() @IsObject() metadata?: Record<string, unknown>;
}
