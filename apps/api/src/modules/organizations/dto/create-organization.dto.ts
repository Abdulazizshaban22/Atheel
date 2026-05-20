import { IsIn, IsOptional, IsString } from 'class-validator';

export class CreateOrganizationDto {
  @IsString() nameAr!: string;
  @IsOptional() @IsString() nameEn?: string;
  @IsIn(['government','semi_government','museum','private','developer','ngo']) sector!:
    'government' | 'semi_government' | 'museum' | 'private' | 'developer' | 'ngo';
  @IsOptional() @IsString() city?: string;
  @IsOptional() @IsString() country?: string;
}
