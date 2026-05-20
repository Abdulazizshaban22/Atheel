import { IsBoolean, IsInt, IsOptional, Max, Min } from 'class-validator';

export class TickExecutionDto {
  @IsOptional() @IsBoolean() hasKnowledge?: boolean;
  @IsOptional() @IsBoolean() hasApprovalActor?: boolean;
  @IsOptional() @IsBoolean() autoApprove?: boolean;
  @IsOptional() @IsInt() @Min(1) @Max(500) maxAutoSteps?: number;
}
