import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class AgentRunDto {
  @IsString() objective!: string;
  @IsOptional() @IsString() organizationId?: string;
  @IsOptional() @IsString() projectId?: string;
  @IsOptional() @IsBoolean() requiresApproval?: boolean;
  @IsOptional() @IsBoolean() runDraft?: boolean;
  @IsOptional() @IsString() providerId?: string;
}
