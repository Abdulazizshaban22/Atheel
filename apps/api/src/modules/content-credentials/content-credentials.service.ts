import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@madar/db';
import { createHash, randomUUID } from 'node:crypto';
import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import { AttachmentsService } from '../attachments/attachments.service';

export type ContentCredentialRecord = {
  id: string;
  organizationId?: string;
  subjectType: 'attachment' | 'external' | 'text';
  subjectId: string;
  subjectName?: string;
  sha256?: string;
  manifestJson: any;
  noteAr?: string;
  createdByUserId?: string;
  createdAt: string;
  updatedAt?: string;
};

function nowIso() {
  return new Date().toISOString();
}

@Injectable()
export class ContentCredentialsService {
  // Fallback store for local scaffolding when DB is not configured.
  private creds: ContentCredentialRecord[] = [];

  constructor(
    private readonly prisma: PrismaService,
    private readonly attachments: AttachmentsService,
  ) {}

  async list(orgId?: string) {
    try {
      const cc = (this.prisma as any)?.contentCredential;
      if (!cc?.findMany) throw new Error('contentCredential unavailable');
      const items = await cc.findMany({
        where: { organizationId: orgId || undefined },
        orderBy: { createdAt: 'desc' },
      });
      return { count: items.length, items };
    } catch {
      const items = this.creds.filter((c) => (!orgId || c.organizationId === orgId));
      return { count: items.length, items };
    }
  }

  async get(id: string) {
    try {
      const cc = (this.prisma as any)?.contentCredential;
      if (!cc?.findUnique) throw new Error('contentCredential unavailable');
      const row = await cc.findUnique({ where: { id } });
      if (!row) throw new NotFoundException('Content credential not found');
      return row;
    } catch {
      const row = this.creds.find((x) => x.id === id);
      if (!row) throw new NotFoundException('Content credential not found');
      return row;
    }
  }

  private buildDefaultManifest(input: {
    subjectType: 'attachment' | 'external' | 'text';
    subject: Record<string, unknown>;
    noteAr?: string;
    organizationId?: string;
  }) {
    return {
      c2pa: {
        version: '0.2-atheel',
        createdAt: nowIso(),
        generator: {
          name: 'ATHEEL',
          version: 'wave20.1',
        },
        subject: input.subject,
        assertions: [
          {
            label: 'provenance',
            value: {
              noteAr: input.noteAr,
              organizationId: input.organizationId,
            },
          },
        ],
      },
    };
  }

  async createFromAttachment(
    attachmentId: string,
    input?: { organizationId?: string; noteAr?: string; createdByUserId?: string },
  ) {
    const att: any = await this.attachments.getById(attachmentId);
    const absPath = join(process.cwd(), att.storagePath);
    const buf = Buffer.from(await fs.readFile(absPath) as Uint8Array);
    const sha256 = createHash('sha256').update(buf).digest('hex');

    const manifest = this.buildDefaultManifest({
      subjectType: 'attachment',
      subject: {
        type: 'attachment',
        id: att.id,
        name: att.originalName,
        mimeType: att.mimeType,
        sizeBytes: att.sizeBytes,
        sha256,
        storagePath: att.storagePath,
      },
      noteAr: input?.noteAr,
      organizationId: input?.organizationId || att.organizationId,
    });

    const id = `c2pa_${randomUUID().slice(0, 10)}`;
    const organizationId = input?.organizationId || att.organizationId || 'org_demo_1';

    try {
      const cc = (this.prisma as any)?.contentCredential;
      if (!cc?.create) throw new Error('contentCredential unavailable');
      const row = await cc.create({
        data: {
          id,
          organizationId,
          subjectType: 'attachment',
          subjectId: att.id,
          subjectName: att.originalName || null,
          sha256,
          manifestJson: manifest,
          noteAr: input?.noteAr || null,
          createdByUserId: input?.createdByUserId || null,
        },
      });
      return { ok: true, credential: row };
    } catch {
      const rec: ContentCredentialRecord = {
        id,
        organizationId,
        subjectType: 'attachment',
        subjectId: att.id,
        subjectName: att.originalName,
        sha256,
        manifestJson: manifest,
        noteAr: input?.noteAr,
        createdByUserId: input?.createdByUserId,
        createdAt: nowIso(),
      };
      this.creds.unshift(rec);
      return { ok: true, credential: rec, note: 'fallback_in_memory' };
    }
  }

  async createManual(input: {
    organizationId?: string;
    subjectType?: 'attachment' | 'external' | 'text';
    subjectId: string;
    subjectName?: string;
    sha256?: string;
    noteAr?: string;
    manifestJson?: any;
    createdByUserId?: string;
  }) {
    const id = `c2pa_${randomUUID().slice(0, 10)}`;
    const organizationId = input.organizationId || 'org_demo_1';
    const subjectType = input.subjectType || 'external';

    const manifest = input.manifestJson || this.buildDefaultManifest({
      subjectType,
      subject: {
        type: subjectType,
        id: input.subjectId,
        name: input.subjectName,
        sha256: input.sha256,
      },
      noteAr: input.noteAr,
      organizationId,
    });

    try {
      const cc = (this.prisma as any)?.contentCredential;
      if (!cc?.create) throw new Error('contentCredential unavailable');
      const row = await cc.create({
        data: {
          id,
          organizationId,
          subjectType,
          subjectId: input.subjectId,
          subjectName: input.subjectName || null,
          sha256: input.sha256 || null,
          noteAr: input.noteAr || null,
          manifestJson: manifest,
          createdByUserId: input.createdByUserId || null,
        },
      });
      return { ok: true, credential: row };
    } catch {
      const rec: ContentCredentialRecord = {
        id,
        organizationId,
        subjectType,
        subjectId: input.subjectId,
        subjectName: input.subjectName,
        sha256: input.sha256,
        noteAr: input.noteAr,
        manifestJson: manifest,
        createdByUserId: input.createdByUserId,
        createdAt: nowIso(),
      };
      this.creds.unshift(rec);
      return { ok: true, credential: rec, note: 'fallback_in_memory' };
    }
  }
}
