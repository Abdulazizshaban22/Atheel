import { IsOptional, IsString } from 'class-validator';

export class DecisionDto {
  @IsOptional() @IsString() note?: string;
  @IsOptional() @IsString() currentApproverId?: string;
  @IsOptional() @IsString() changes?: string;
}
