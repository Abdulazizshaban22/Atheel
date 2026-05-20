import { IsOptional, IsString, MaxLength } from 'class-validator';

export class OutboxMarkFailedDto {
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  error?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  message?: string;
}
