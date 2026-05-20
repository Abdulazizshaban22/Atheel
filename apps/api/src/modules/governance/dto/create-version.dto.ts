import { IsOptional, IsString } from 'class-validator';

export class CreateGovernancePolicyVersionDto {
  @IsString() version!: string;
  policyJson!: any;
  @IsOptional() @IsString() changelog?: string;
}
