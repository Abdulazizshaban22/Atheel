
import { ApiPropertyOptional } from '@nestjs/swagger';

export class DecisionRecommendationDto {
  @ApiPropertyOptional() organizationId?: string;
  @ApiPropertyOptional() projectId?: string;
  @ApiPropertyOptional() destinationId?: string;
  @ApiPropertyOptional() twinId?: string;
  @ApiPropertyOptional() heritageAssetId?: string;
  @ApiPropertyOptional() contextSummary?: string;
  @ApiPropertyOptional({ type: [Object] }) evidence?: Array<Record<string, unknown>>;
  @ApiPropertyOptional({ type: [String] }) goals?: string[];
  @ApiPropertyOptional({ type: [String] }) constraints?: string[];
}
