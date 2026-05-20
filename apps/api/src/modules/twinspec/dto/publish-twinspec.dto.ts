import { IsBoolean, IsIn, IsOptional } from 'class-validator';

export class PublishTwinSpecDto {
  @IsOptional()
  @IsIn(['replace','merge'])
  mode?: 'replace' | 'merge';

  @IsOptional()
  @IsBoolean()
  createSimulations?: boolean;

  @IsOptional()
  @IsBoolean()
  enqueueSimulations?: boolean;
}
