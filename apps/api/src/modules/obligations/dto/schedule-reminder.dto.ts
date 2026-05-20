import { IsOptional, IsString, IsArray, IsObject, IsNumber, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ScheduleReminderDto {
  @ApiProperty({ description: 'ISO date-time for reminder' })
  remindAt!: string;

  @ApiProperty({ required: false, enum: ['in_app', 'email'] })
  channel?: string;
}
