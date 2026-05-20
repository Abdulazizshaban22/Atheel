import { IsArray, IsBoolean, IsIn, IsInt, IsNumber, IsOptional, IsString, Max, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class ChatMessageDto {
  @IsIn(['system', 'user', 'assistant', 'tool'])
  role!: 'system' | 'user' | 'assistant' | 'tool';

  @IsString()
  content!: string;
}

export class ChatCompletionDto {
  @IsOptional() @IsString() providerId?: string;
  @IsOptional() @IsString() organizationId?: string;
  @IsOptional() @IsString() modelName?: string;
  @IsArray() @ValidateNested({ each: true }) @Type(() => ChatMessageDto)
  messages!: ChatMessageDto[];
  @IsOptional() @IsNumber() @Min(0) @Max(2) temperature?: number;
  @IsOptional() @IsInt() @Min(32) @Max(4000) maxTokens?: number;
  @IsOptional() @IsBoolean() preferKnowledge?: boolean;
}
