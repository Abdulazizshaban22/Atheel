import { IsArray, IsInt, IsObject, IsOptional, IsString, Min } from 'class-validator';

export class SaveTemplateGraphDto {
  // Designer graph structure (nodes/edges) - validated at a coarse level to prevent overposting.
  @IsOptional() @IsString() templateId?: string;
  @IsOptional() @IsInt() @Min(1) version?: number;
  @IsArray() @IsOptional() nodes?: any[];
  @IsArray() @IsOptional() edges?: any[];
  @IsOptional() @IsObject() viewport?: Record<string, unknown>;
}
