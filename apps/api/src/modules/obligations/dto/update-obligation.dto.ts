import { IsOptional, IsString, IsArray, IsObject, IsNumber, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateObligationDto {
  @ApiPropertyOptional() titleAr?: string;
  @ApiPropertyOptional() descriptionAr?: string;
  @ApiPropertyOptional({ enum: ['open', 'in_progress', 'done', 'waived', 'overdue'] }) status?: string;
  @ApiPropertyOptional() ownerUserId?: string | null;
  @ApiPropertyOptional() dueAt?: string | null; // ISO
}
