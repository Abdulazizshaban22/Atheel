import { IsBoolean, IsIn, IsObject, IsOptional, IsString } from 'class-validator';

export class ExecutionActionDto {
  @IsIn(['approve', 'provide_input', 'retry', 'pause', 'resume'])
  type!: 'approve' | 'provide_input' | 'retry' | 'pause' | 'resume';

  @IsOptional() @IsString() noteAr?: string;
  @IsOptional() @IsObject() payload?: Record<string, unknown>;

  @IsOptional() @IsBoolean() autoTick?: boolean;
  @IsOptional() @IsBoolean() hasKnowledge?: boolean;
  @IsOptional() @IsBoolean() hasApprovalActor?: boolean;
  @IsOptional() @IsBoolean() autoApprove?: boolean;
}
