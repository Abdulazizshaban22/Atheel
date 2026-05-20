import { IsBoolean, IsIn, IsOptional, IsString } from 'class-validator';

export class SimulateWorkflowRunDto {
  @IsOptional() @IsString() templateId?: string;
  @IsOptional() @IsString() instanceId?: string;
  @IsOptional() @IsBoolean() hasKnowledge?: boolean;
  @IsOptional() @IsBoolean() hasApprovalActor?: boolean;
  @IsOptional() @IsIn(['low', 'normal', 'high']) priority?: 'low' | 'normal' | 'high';
  @IsOptional() @IsBoolean() persistRun?: boolean;
}
