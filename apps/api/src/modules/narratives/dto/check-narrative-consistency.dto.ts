import { IsArray, IsObject, IsOptional, IsString } from 'class-validator';

export class CheckNarrativeConsistencyDto {
  @IsOptional() @IsString() organizationId?: string;
  @IsOptional() @IsString() projectId?: string;
  @IsOptional() @IsString() placeIdentity?: string;
  @IsOptional() @IsString() expectedTone?: string;
  @IsOptional() @IsString() audience?: string;
  @IsOptional() @IsArray() channels?: Array<{ channel: string; text: string }>;
  @IsOptional() @IsObject() narrativePolicy?: Record<string, unknown>;
}
