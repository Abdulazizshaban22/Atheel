import { IsOptional, IsString, IsBoolean } from 'class-validator';

export class UpdateCompetitionRequirementDto {
  @IsOptional() @IsString() category?: string;
  @IsOptional() @IsString() discipline?: string;
  @IsOptional() @IsString() textAr?: string;
  @IsOptional() @IsString() cityOrLocation?: string;
  @IsOptional() quantitiesJson?: any;
  @IsOptional() constraintsJson?: any;
  @IsOptional() sourceRefJson?: any;
  @IsOptional() @IsString() priority?: string;
  @IsOptional() @IsString() status?: string;
  @IsOptional() @IsBoolean() inStudioScope?: boolean;
}
