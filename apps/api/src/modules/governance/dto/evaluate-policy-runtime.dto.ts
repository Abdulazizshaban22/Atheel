import { IsOptional, IsString, IsArray, IsObject, IsNumber, MaxLength } from 'class-validator';

import { ApiPropertyOptional } from '@nestjs/swagger';
export class EvaluatePolicyRuntimeDto {
  @ApiPropertyOptional() organizationId?: string;
  @ApiPropertyOptional() policyPackId?: string;
  @ApiPropertyOptional() entityType?: string;
  @ApiPropertyOptional() entityId?: string;
  @ApiPropertyOptional() action?: string;
  @ApiPropertyOptional() riskLevel?: 'low'|'medium'|'high'|'critical';
  @ApiPropertyOptional({ type: [String] }) evidenceKeys?: string[];
  @ApiPropertyOptional() heritageSensitivity?: number;
  @ApiPropertyOptional() capacityPressure?: number;
}
