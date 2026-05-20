import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateSloPolicyDto {
  @IsOptional()
  @IsString()
  organizationId?: string;

  @IsString()
  name!: string;

  @IsString()
  targetType!: string; // approvals|workflows|outbox|custom

  @IsInt()
  @Min(1)
  @Max(365)
  windowDays!: number;

  @IsInt()
  @Min(90)
  @Max(9999)
  targetPermille!: number; // 9950 = 99.5%
}
