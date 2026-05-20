import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class AssignRequirementDto {
  @IsString() userId!: string;
  @IsOptional() @IsString() role?: 'owner' | 'contributor' | 'reviewer';
  @IsOptional() @IsBoolean() isOwner?: boolean;
}
