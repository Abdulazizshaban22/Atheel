import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class DispatchNextWorkflowDto {
  @IsOptional() @IsString() organizationId?: string;
  @IsOptional() @IsString() projectId?: string;
  @IsOptional() @IsBoolean() autoApprove?: boolean;
  @IsOptional() @IsBoolean() hasKnowledge?: boolean;
  @IsOptional() @IsBoolean() hasApprovalActor?: boolean;
}
