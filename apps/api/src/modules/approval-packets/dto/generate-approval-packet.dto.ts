import { IsOptional, IsString } from 'class-validator';

export class GenerateApprovalPacketDto {
  @IsOptional() @IsString() organizationId?: string;
  @IsOptional() @IsString() projectId?: string;
  @IsOptional() @IsString() experienceId?: string;
  @IsString() twinId!: string;
  @IsString() simulationRunId!: string;
  @IsOptional() @IsString() scenarioKey?: string;
  @IsOptional() @IsString() workspaceId?: string;
  @IsOptional() @IsString() providerId?: string;
}
