import { IsOptional, IsString, IsArray, IsObject, IsNumber, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
export class CreateAssetPackDto {
  @ApiPropertyOptional() organizationId?: string;
  @ApiPropertyOptional() projectId?: string;
  @ApiPropertyOptional() conceptTitle?: string;
  @ApiPropertyOptional({ type: [String] }) channels?: string[];
}
