import { ApiPropertyOptional } from '@nestjs/swagger';
export class CreateAssetPackDto {
  @ApiPropertyOptional() organizationId?: string;
  @ApiPropertyOptional() projectId?: string;
  @ApiPropertyOptional() conceptTitle?: string;
  @ApiPropertyOptional({ type: [String] }) channels?: string[];
}
