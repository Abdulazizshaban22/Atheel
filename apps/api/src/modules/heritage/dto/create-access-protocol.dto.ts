import { IsObject, IsString, MaxLength } from 'class-validator';

export class CreateHeritageAccessProtocolDto {
  @IsString()
  @MaxLength(200)
  nameAr!: string;

  @IsObject()
  rulesJson!: Record<string, unknown>;
}
