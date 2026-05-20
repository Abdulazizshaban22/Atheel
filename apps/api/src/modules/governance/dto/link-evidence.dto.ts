import { IsOptional, IsString, IsArray, IsObject, IsNumber, MaxLength } from 'class-validator';

import { ApiPropertyOptional } from '@nestjs/swagger';
export class LinkEvidenceDto {
  @ApiPropertyOptional() organizationId?: string;
  @ApiPropertyOptional() entityType?: string;
  @ApiPropertyOptional() entityId?: string;
  @ApiPropertyOptional() nodeType?: string;
  @ApiPropertyOptional() nodeRef?: string;
  @ApiPropertyOptional() title?: string;
  @ApiPropertyOptional() relation?: string;
  @ApiPropertyOptional() summary?: string;
}
