import { IsArray, IsOptional, IsString } from 'class-validator';

export class RegisterBookingConnectorDto {
  @IsOptional() @IsString() organizationId?: string;
  @IsString() provider!: string;
  @IsOptional() @IsString() label?: string;
  @IsOptional() @IsString() baseUrl?: string;
  @IsOptional() @IsString() externalProjectId?: string;
  @IsOptional() @IsArray() scopes?: string[];
}
