import { IsOptional, IsString, IsArray, IsObject, IsNumber, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
export class ComposeStudioNarrativeDto {
  @ApiPropertyOptional() organizationId?: string;
  @ApiPropertyOptional() projectId?: string;
  @ApiPropertyOptional() conceptTitle?: string;
  @ApiPropertyOptional() placeIdentity?: string;
  @ApiPropertyOptional() emotionalThesis?: string;
}
