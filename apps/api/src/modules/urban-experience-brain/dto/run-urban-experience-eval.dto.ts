
import { IsOptional, IsString } from 'class-validator';
export class RunUrbanExperienceEvalDto { @IsString() query!: string; @IsOptional() @IsString() organizationId?: string; }
