import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class ReembedKnowledgeDto {
  @IsOptional() @IsString() organizationId?: string;
  @IsOptional() @IsString() projectId?: string;
  @IsOptional() @IsString() documentId?: string;
  @IsOptional() @IsString() providerId?: string;
  @IsOptional() @IsBoolean() force?: boolean;
}
