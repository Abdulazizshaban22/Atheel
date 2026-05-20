import { IsObject, IsOptional, IsString } from 'class-validator';

export class CreateExperimentVariantDto {
  @IsString() key!: string; // e.g. A, B
  @IsString() labelAr!: string;
  @IsOptional() @IsObject() payloadJson?: any; // free-form JSON
}
