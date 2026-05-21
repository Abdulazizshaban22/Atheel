
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterAgentDto {
  @ApiPropertyOptional() id?: string;
  @ApiProperty() name!: string;
  @ApiProperty() purpose!: string;
  @ApiPropertyOptional() organizationId?: string;
  @ApiPropertyOptional() riskLevel?: 'low'|'medium'|'high';
  @ApiPropertyOptional({ type: [String] }) allowedTools?: string[];
  @ApiPropertyOptional({ type: [String] }) allowedDataDomains?: string[];
  @ApiPropertyOptional() requiresHumanReview?: boolean;
  @ApiPropertyOptional() outputSchemaName?: string;
}
