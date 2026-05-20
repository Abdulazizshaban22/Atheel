import { IsBoolean, IsIn, IsNumber, IsObject, IsOptional, IsString } from 'class-validator';

export class EnqueueWorkflowExecutionDto {
  @IsOptional() @IsString() templateId?: string;
  @IsOptional() @IsString() instanceId?: string;
  @IsOptional() @IsString() workflowRunId?: string;
  @IsOptional() @IsString() organizationId?: string;
  @IsOptional() @IsString() projectId?: string;
  @IsOptional() @IsIn(['low', 'normal', 'high', 'urgent']) priority?: 'low' | 'normal' | 'high' | 'urgent';
  @IsOptional() @IsObject() inputs?: Record<string, unknown>;
  @IsOptional() @IsNumber() strategicValue?: number;
  @IsOptional() @IsNumber() backlogDepth?: number;
  @IsOptional() @IsBoolean() autoStart?: boolean;
  @IsOptional() @IsBoolean() autoApprove?: boolean;
  @IsOptional() @IsBoolean() hasKnowledge?: boolean;
  @IsOptional() @IsBoolean() hasApprovalActor?: boolean;
}
