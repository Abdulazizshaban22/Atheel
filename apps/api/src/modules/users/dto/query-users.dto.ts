import { IsOptional, IsString } from 'class-validator';

export class QueryUsersDto {
  @IsOptional() @IsString() q?: string;
  @IsOptional() @IsString() orgId?: string;
}
