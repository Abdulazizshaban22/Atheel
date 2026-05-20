import { IsIn, IsOptional, IsString } from 'class-validator';

export class CreateApprovalDto {
  @IsString() organizationId!: string;
  @IsIn(['project','content','experience']) entityType!: 'project' | 'content' | 'experience';
  @IsString() entityId!: string;
  @IsString() title!: string;
  @IsOptional() @IsString() dueAt?: string;
  @IsOptional() @IsString() contextViolationType?: string;
  @IsOptional() @IsString() contextDomain?: string;
  @IsOptional() @IsString() contextRegion?: string;
  payloadSnapshot?: Record<string, unknown>;
}
