import { ApiPropertyOptional } from '@nestjs/swagger';
export class ComposeStudioNarrativeDto {
  @ApiPropertyOptional() organizationId?: string;
  @ApiPropertyOptional() projectId?: string;
  @ApiPropertyOptional() conceptTitle?: string;
  @ApiPropertyOptional() placeIdentity?: string;
  @ApiPropertyOptional() emotionalThesis?: string;
}
