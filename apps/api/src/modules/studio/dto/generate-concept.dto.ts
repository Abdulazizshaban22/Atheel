import { ApiPropertyOptional } from '@nestjs/swagger';
export class GenerateConceptDto {
  @ApiPropertyOptional() organizationId?: string;
  @ApiPropertyOptional() projectId?: string;
  @ApiPropertyOptional() brief?: string;
  @ApiPropertyOptional({ type: [String] }) audiences?: string[];
  @ApiPropertyOptional({ type: [String] }) constraints?: string[];
}
