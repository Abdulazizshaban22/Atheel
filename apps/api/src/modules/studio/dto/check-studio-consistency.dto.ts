import { IsOptional, IsString, IsArray, IsObject, IsNumber, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
export class CheckStudioConsistencyDto {
  @ApiPropertyOptional() organizationId?: string;
  @ApiPropertyOptional() projectId?: string;
  @ApiPropertyOptional({ type: [Object] }) artifacts?: Array<Record<string, unknown>>;
}
