import { IsObject } from 'class-validator';

export class ValidatePolicyDslDto {
  @IsObject()
  dsl!: Record<string, unknown>;
}
