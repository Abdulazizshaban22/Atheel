import { ApiPropertyOptional } from '@nestjs/swagger';
export class CheckStudioConsistencyDto {
  @ApiPropertyOptional() organizationId?: string;
  @ApiPropertyOptional() projectId?: string;
  @ApiPropertyOptional({ type: [Object] }) artifacts?: Array<Record<string, unknown>>;
}
