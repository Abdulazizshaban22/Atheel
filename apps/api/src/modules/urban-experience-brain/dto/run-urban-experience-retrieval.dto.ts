
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
export class RunUrbanExperienceRetrievalDto {
  @IsString() query!: string;
  @IsOptional() @IsString() organizationId?: string;
  @IsOptional() @IsString() routeType?: string;
  @IsOptional() @IsString() placeType?: string;
  @IsOptional() @IsInt() @Min(1) @Max(25) topK?: number;
}
