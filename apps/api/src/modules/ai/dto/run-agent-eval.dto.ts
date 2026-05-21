
import { ApiPropertyOptional } from '@nestjs/swagger';

export class RunAgentEvalDto {
  @ApiPropertyOptional() organizationId?: string;
  @ApiPropertyOptional() datasetName?: string;
  @ApiPropertyOptional({ type: [Object] }) samples?: Array<Record<string, unknown>>;
  @ApiPropertyOptional({ type: [String] }) dimensions?: string[];
}
