import { IsArray, IsOptional, IsString } from 'class-validator';

export class SyncBookingsDto {
  @IsOptional() @IsString() organizationId?: string;
  @IsString() connectorId!: string;
  @IsOptional() @IsString() experienceId?: string;
  @IsOptional() @IsArray() externalOrders?: Array<Record<string, unknown>>;
}
