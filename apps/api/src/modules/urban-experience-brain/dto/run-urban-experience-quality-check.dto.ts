import { IsOptional, IsString } from 'class-validator';
export class RunUrbanExperienceQualityCheckDto { @IsOptional() @IsString() organizationId?: string; }
