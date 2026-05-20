import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class UpsertApprovalSkillDto {
  @IsOptional()
  @IsString()
  organizationId?: string;

  @IsString()
  reviewerUserId!: string;

  @IsString()
  dimension!: string; // e.g. entityType:content | domain:heritage | region:taif

  @IsInt()
  @Min(0)
  @Max(100)
  skillScore!: number;
}
