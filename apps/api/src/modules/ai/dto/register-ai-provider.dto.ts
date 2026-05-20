import { IsBoolean, IsIn, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class RegisterAiProviderDto {
  @IsOptional() @IsString() id?: string;
  @IsOptional() @IsString() organizationId?: string;
  @IsString() name!: string;
  @IsIn(['mock', 'vllm_openai_compatible'])
  kind!: 'mock' | 'vllm_openai_compatible';
  @IsOptional() @IsString() baseUrl?: string;
  @IsOptional() @IsString() apiKeyEnvName?: string;
  @IsOptional() @IsString() modelName?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @IsNumber() @Min(0) @Max(2) temperatureDefault?: number;
  @IsOptional() @IsNumber() @Min(32) @Max(4000) maxTokensDefault?: number;
}
