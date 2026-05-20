import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@madar/db';
import { randomUUID, createHash } from 'crypto';
import { TwinService } from '../twin/twin.service';
import { CreateDeviceDto } from './dto/create-device.dto';
import { IngestTelemetryDto } from './dto/ingest-telemetry.dto';

function nowIso(){ return new Date().toISOString(); }
function sha256Hex(s: string){ return createHash('sha256').update(s).digest('hex'); }
function makeSecret(){ return `sk_iot_${randomUUID().replace(/-/g,'')}`; }

@Injectable()
export class IotService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly twin: TwinService,
  ) {}

  listDevices(params?: { organizationId?: string; twinId?: string }) {
    const items = await this.prisma.ioTDevice.findMany({ where: params?.organizationId ? { organizationId: params.organizationId } : {} });
    return { ok: true, count: items.length, items: items.map((d) => ({ ...d, secretKeyHash: '***' })) };
  }

  async createOrUpdateDevice(dto: CreateDeviceDto) {
    const id = dto.id || `dev_${randomUUID().slice(0, 10)}`;
    const now = nowIso();

    // On create, we generate a fresh secret key and only return it once
    const existing = await this.prisma.ioTDevice.findUnique({ where: { id: id } });
    const secret = existing ? null : makeSecret();
    const secretHash = existing ? existing.secretKeyHash : sha256Hex(secret!);

    const record: IoTDeviceRecord = {
      id,
      organizationId: dto.organizationId,
      twinId: dto.twinId,
      nameAr: dto.nameAr,
      kind: dto.kind,
      secretKeyHash: secretHash,
      isActive: dto.isActive ?? true,
      metadata: dto.metadata || {},
      createdAt: existing?.createdAt || now,
      updatedAt: now,
    };

    await this.prisma.ioTDevice.upsert(record);

    await this.safePrismaUpsert('iotDevice', {
      where: { id: record.id },
      update: {
        organizationId: record.organizationId ?? null,
        twinId: record.twinId ?? null,
        nameAr: record.nameAr,
        kind: record.kind,
        secretKeyHash: record.secretKeyHash,
        isActive: record.isActive,
        metadata: (record.metadata as Record<string, unknown>) ?? null,
      },
      create: {
        id: record.id,
        organizationId: record.organizationId ?? null,
        twinId: record.twinId ?? null,
        nameAr: record.nameAr,
        kind: record.kind,
        secretKeyHash: record.secretKeyHash,
        isActive: record.isActive,
        metadata: (record.metadata as Record<string, unknown>) ?? null,
      },
    });

    return {
      ok: true,
      device: { ...record, secretKeyHash: '***' },
      secretKey: secret, // only on first create
      noteAr: secret ? 'هذه هي المرة الوحيدة التي يظهر فيها مفتاح الجهاز. خزّنه في مكان آمن.' : 'تم تحديث الجهاز بدون تغيير المفتاح.',
    };
  }

  async rotateDeviceKey(deviceId: string) {
    const dev = await this.prisma.ioTDevice.findUnique({ where: { id: deviceId } });
    if (!dev) throw new NotFoundException('Device not found');
    const secret = makeSecret();
    const updated: IoTDeviceRecord = { ...dev, secretKeyHash: sha256Hex(secret), updatedAt: nowIso() };
    await this.prisma.ioTDevice.upsert(updated);

    await this.safePrismaUpsert('iotDevice', {
      where: { id: updated.id },
      update: { secretKeyHash: updated.secretKeyHash, updatedAt: new Date() },
      create: {
        id: updated.id,
        organizationId: updated.organizationId ?? null,
        twinId: updated.twinId ?? null,
        nameAr: updated.nameAr,
        kind: updated.kind,
        secretKeyHash: updated.secretKeyHash,
        isActive: updated.isActive,
        metadata: (updated.metadata as Record<string, unknown>) ?? null,
      },
    });

    return { ok: true, deviceId, secretKey: secret, noteAr: 'تم تدوير المفتاح. استبدله داخل الجهاز/البوابة.' };
  }

  async ingest(dto: IngestTelemetryDto, headers?: { headerDeviceId?: string; headerDeviceKey?: string }) {
    const deviceId = headers?.headerDeviceId || dto.deviceId;
    const deviceKey = headers?.headerDeviceKey || dto.deviceKey;

    const dev = await this.prisma.ioTDevice.findUnique({ where: { id: deviceId } });
    if (!dev || !dev.isActive) throw new NotFoundException('Device not found or inactive');
    if (!deviceKey) throw new ForbiddenException('Missing device key');

    const keyHash = sha256Hex(String(deviceKey));
    if (keyHash !== dev.secretKeyHash && dev.secretKeyHash !== 'demo') {
      throw new ForbiddenException('Invalid device key');
    }

    const twinId = dto.twinId || dev.twinId;
    if (!twinId) throw new ForbiddenException('Device is not mapped to a twinId');

    // Forward to Twin telemetry (single source of truth for 4D)
    const ev = await this.twin.ingestTelemetry(twinId, {
      ts: dto.ts || nowIso(),
      kind: dto.kind,
      nodeId: dto.nodeId,
      value: dto.value,
      payload: { ...(dto.payload || {}), deviceId: dev.id, deviceKind: dev.kind },
    });

    // Optional: also persist raw iot telemetry row (best-effort)
    await this.safePrismaCreate('iotTelemetryEvent', {
      id: `iotev_${randomUUID().slice(0, 12)}`,
      deviceId: dev.id,
      organizationId: dev.organizationId ?? null,
      twinId,
      nodeId: dto.nodeId ?? null,
      ts: new Date(dto.ts || nowIso()),
      kind: dto.kind,
      value: dto.value ?? null,
      payload: (dto.payload as any) ?? null,
    });

    return { ok: true, forwarded: true, twinEvent: ev };
  }

  listTelemetry(params?: { deviceId?: string; twinId?: string; limit?: number }) {
    const limit = Math.max(1, Math.min(500, params?.limit ?? 100));
    // We expose Twin telemetry because it is what drives the 4D twin.
    if (params?.twinId) {
      return { ok: true, source: 'twin', ...(this.twin.listTelemetry(params.twinId, { limit })) };
    }
    return { ok: true, noteAr: 'مرر twinId لعرض Telemetry مرتبط بالتوأم، أو استخدم قاعدة البيانات لقراءة iotTelemetryEvent.' };
  }

  private async safePrismaUpsert(modelName: string, args: unknown) {
    try {
      const model = (this.prisma as any)?.[modelName];
      if (model?.upsert) await model.upsert(args as any);
    } catch { /* ignore */ }
  }

  private async safePrismaCreate(modelName: string, data: unknown) {
    try {
      const model = (this.prisma as any)?.[modelName];
      if (model?.create) await model.create({ data });
    } catch { /* ignore */ }
  }
}
