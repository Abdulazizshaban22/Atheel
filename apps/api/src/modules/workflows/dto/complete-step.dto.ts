import { IsInt, IsObject, IsOptional, IsString, Min } from 'class-validator';

export class CompleteDeferredStepDto {
  @IsOptional() @IsObject() output?: Record<string, unknown>;
  @IsOptional() @IsString() noteAr?: string;
  @IsOptional() @IsString() idempotencyKey?: string;
  @IsOptional() @IsInt() @Min(0) attempt?: number;
  @IsOptional() @IsObject() job?: { queue?: string; jobId?: string | number };
}
