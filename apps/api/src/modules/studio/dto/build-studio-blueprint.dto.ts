import { IsOptional, IsString, IsArray, IsObject, IsNumber, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
export class BuildStudioBlueprintDto {
  @ApiPropertyOptional() organizationId?: string;
  @ApiPropertyOptional() projectId?: string;
  @ApiPropertyOptional() title?: string;
  @ApiPropertyOptional({ type: [String] }) zones?: string[];
  @ApiPropertyOptional({ type: [String] }) touchpoints?: string[];
}
