import { IsBoolean, IsObject, IsOptional, IsString } from 'class-validator';

export class InstantiateWorkflowDto {
  @IsString() templateId!: string;
  @IsOptional() @IsString() organizationId?: string;
  @IsOptional() @IsString() projectId?: string;
  @IsOptional() @IsObject() parameters?: Record<string, unknown>;
  @IsOptional() @IsBoolean() autoActivate?: boolean;
  @IsOptional() @IsString() createdByUserId?: string;
}
