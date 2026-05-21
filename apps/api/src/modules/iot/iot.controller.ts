import { Body, Controller, Get, Headers, Param, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { IotService } from './iot.service';
import { CreateDeviceDto } from './dto/create-device.dto';
import { IngestTelemetryDto } from './dto/ingest-telemetry.dto';

@ApiTags('iot')
@Controller('iot')
export class IotController {
  constructor(private readonly iot: IotService) {}

  @Get('devices')
  listDevices(@Query('organizationId') organizationId?: string, @Query('twinId') twinId?: string) {
    return this.iot.listDevices({ organizationId, twinId });
  }

  @Post('devices')
  createDevice(@Body() dto: CreateDeviceDto) {
    return this.iot.createOrUpdateDevice(dto);
  }

  @Post('devices/:id/rotate-key')
  rotateKey(@Param('id') id: string) {
    return this.iot.rotateDeviceKey(id);
  }

  /**
   * Telemetry ingest endpoint:
   * - send x-device-id + x-device-key headers (preferred)
   * - or include deviceId + deviceKey in body
   */
  @Post('ingest')
  ingest(@Body() dto: IngestTelemetryDto, @Headers('x-device-id') hdrId?: string, @Headers('x-device-key') hdrKey?: string) {
    return this.iot.ingest(dto, { headerDeviceId: hdrId, headerDeviceKey: hdrKey });
  }

  @Get('telemetry')
  listTelemetry(@Query('deviceId') deviceId?: string, @Query('twinId') twinId?: string, @Query('limit') limit?: string) {
    return this.iot.listTelemetry({ deviceId, twinId, limit: limit ? Number(limit) : undefined });
  }
}
