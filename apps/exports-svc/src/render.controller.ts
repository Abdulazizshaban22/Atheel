import { Body, Controller, Get, Headers, Post, UnauthorizedException } from '@nestjs/common';
import { Ctx, MessagePattern, Payload, RmqContext } from '@nestjs/microservices';
import { createHash } from 'node:crypto';

import { buildPdfFromMarkdown, buildPptxFromMarkdown, buildZip, type GovTemplateMeta } from '@madar/doc-kernel';
import { createObjectStoreFromEnv, type ObjectRef, type ObjectStore } from '@madar/object-store';

function sha256Hex(buf: Buffer) {
  return createHash('sha256').update(buf).digest('hex');
}

type RenderRequest = {
  jobId: string;
  packetId: string;
  includePptx: boolean;
  includePdf: boolean;
  includeBundleZip: boolean;
  includeSignatures: boolean;
  pageSize: 'A4' | 'Letter';

  titles: {
    deckTitle: string;
    strategyTitle: string;
    opsTitle: string;
    packetTitle: string;
  };

  templateMeta: GovTemplateMeta;

  markdown: {
    deck: string;
    strategy: string;
    ops: string;
    packet: string;
  };

  bundle: {
    verificationUrl: string;
    verificationCode: string;
    approvalId?: string;
    provenance?: any;
  };
};

type RenderArtifact = {
  name: string;
  mimeType: string;
  sizeBytes: number;
  sha256: string;
  // Wave60: بدل نقل الملفات داخل الرسائل، نرجع مؤشرات على Object Store.
  object?: ObjectRef;
  // للتوافق فقط (اختياري)
  base64?: string;
};

@Controller()
export class RenderController {
  private readonly objectStore: ObjectStore = createObjectStoreFromEnv();

  @Get('/health')
  health() {
    return { ok: true, service: 'exports-svc' };
  }

  private assertInternalToken(token: string | undefined) {
    const expected = process.env.EXPORTS_RENDERER_TOKEN;
    if (!expected || token !== expected) throw new UnauthorizedException('invalid_internal_token');
  }

  private async doRender(body: RenderRequest) {
    const artifacts: RenderArtifact[] = [];

    const artifactsMode = String(process.env.EXPORTS_ARTIFACTS_MODE || 'object_store').trim().toLowerCase();
    const returnInline = artifactsMode === 'inline' || artifactsMode === 'base64';

    const safeName = (v: string) => String(v || 'artifact').replace(/[^a-zA-Z0-9._-]/g, '_');
    const store = async (name: string, mimeType: string, buf: Buffer) => {
      const key = `exports/${safeName(body.packetId)}/${new Date().toISOString().slice(0, 10)}/${Date.now()}_${safeName(name)}`;
      const put = await this.objectStore.putBuffer({ key, buffer: buf, contentType: mimeType });
      return put.ref;
    };

    // 1) PPTX
    let pptxBuf: Buffer | undefined;
    if (body.includePptx) {
      pptxBuf = await buildPptxFromMarkdown(body.markdown.deck, {
        templateMeta: { ...body.templateMeta, reportTitleAr: body.titles.deckTitle },
        addSignatureSlide: body.includeSignatures,
      });

      const obj = returnInline ? undefined : await store(`ATHEEL_${body.packetId}_EventDeck.pptx`, 'application/vnd.openxmlformats-officedocument.presentationml.presentation', pptxBuf);
      artifacts.push({
        name: `ATHEEL_${body.packetId}_EventDeck.pptx`,
        mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        sizeBytes: pptxBuf.length,
        sha256: sha256Hex(pptxBuf),
        object: obj,
        base64: returnInline ? pptxBuf.toString('base64') : undefined,
      });
    }

    // 2) PDFs
    let strategyPdf: Buffer | undefined;
    let opsPdf: Buffer | undefined;
    let packetPdf: Buffer | undefined;

    if (body.includePdf) {
      strategyPdf = await buildPdfFromMarkdown(body.markdown.strategy, {
        templateMeta: { ...body.templateMeta, reportTitleAr: body.titles.strategyTitle },
        addSignaturePage: body.includeSignatures,
        pageSize: body.pageSize,
      });
      opsPdf = await buildPdfFromMarkdown(body.markdown.ops, {
        templateMeta: { ...body.templateMeta, reportTitleAr: body.titles.opsTitle },
        addSignaturePage: body.includeSignatures,
        pageSize: body.pageSize,
      });
      packetPdf = await buildPdfFromMarkdown(body.markdown.packet, {
        templateMeta: { ...body.templateMeta, reportTitleAr: body.titles.packetTitle },
        addSignaturePage: body.includeSignatures,
        pageSize: body.pageSize,
      });

      artifacts.push({
        name: `ATHEEL_${body.packetId}_Strategy.pdf`,
        mimeType: 'application/pdf',
        sizeBytes: strategyPdf.length,
        sha256: sha256Hex(strategyPdf),
        object: returnInline ? undefined : await store(`ATHEEL_${body.packetId}_Strategy.pdf`, 'application/pdf', strategyPdf),
        base64: returnInline ? strategyPdf.toString('base64') : undefined,
      });

      artifacts.push({
        name: `ATHEEL_${body.packetId}_OperationalStudy.pdf`,
        mimeType: 'application/pdf',
        sizeBytes: opsPdf.length,
        sha256: sha256Hex(opsPdf),
        object: returnInline ? undefined : await store(`ATHEEL_${body.packetId}_OperationalStudy.pdf`, 'application/pdf', opsPdf),
        base64: returnInline ? opsPdf.toString('base64') : undefined,
      });

      artifacts.push({
        name: `ATHEEL_${body.packetId}_ApprovalPacket.pdf`,
        mimeType: 'application/pdf',
        sizeBytes: packetPdf.length,
        sha256: sha256Hex(packetPdf),
        object: returnInline ? undefined : await store(`ATHEEL_${body.packetId}_ApprovalPacket.pdf`, 'application/pdf', packetPdf),
        base64: returnInline ? packetPdf.toString('base64') : undefined,
      });
    }

    // 3) Bundle ZIP
    if (body.includeBundleZip) {
      const filesForZip: Array<{ name: string; buffer: Buffer }> = [];

      if (pptxBuf) filesForZip.push({ name: 'Event_Deck.pptx', buffer: pptxBuf });
      if (strategyPdf) filesForZip.push({ name: 'Strategy.pdf', buffer: strategyPdf });
      if (opsPdf) filesForZip.push({ name: 'Operational_Study.pdf', buffer: opsPdf });
      if (packetPdf) filesForZip.push({ name: 'Approval_Packet.pdf', buffer: packetPdf });

      const generatedAt = new Date().toISOString();
      const bundleMeta = {
        packetId: body.packetId,
        approvalId: body.bundle.approvalId,
        generatedAt,
        verificationUrl: body.bundle.verificationUrl,
        schema: 'atheel.bundle.meta.v1',
      };
      filesForZip.push({ name: 'bundle_meta.json', buffer: Buffer.from(JSON.stringify(bundleMeta, null, 2), 'utf8') });

      const provenance =
        body.bundle.provenance ||
        {
          schema: 'atheel.bundle.provenance.v1',
          generatedAt,
          agent: { system: 'exports-svc' },
          subject: { packetId: body.packetId },
          decision: body.bundle.approvalId ? { approvalId: body.bundle.approvalId } : null,
          sources: [],
        };
      filesForZip.push({ name: 'provenance.json', buffer: Buffer.from(JSON.stringify(provenance, null, 2), 'utf8') });

      const filesForManifest = filesForZip.filter((f) => f.name !== 'manifest.json' && f.name !== 'manifest.sha256');
      const manifest = {
        schema: 'atheel.bundle.manifest.v1',
        packetId: body.packetId,
        approvalId: body.bundle.approvalId,
        generatedAt,
        verificationUrl: body.bundle.verificationUrl,
        verificationCode: body.bundle.verificationCode,
        algorithm: 'sha256',
        files: filesForManifest.map((f) => ({ name: f.name, sizeBytes: f.buffer.length, sha256: sha256Hex(f.buffer) })),
        totalFiles: filesForManifest.length,
      };

      const manifestJson = Buffer.from(JSON.stringify(manifest, null, 2), 'utf8');
      const manifestSha = sha256Hex(manifestJson);
      filesForZip.push({ name: 'manifest.json', buffer: manifestJson });
      filesForZip.push({ name: 'manifest.sha256', buffer: Buffer.from(`${manifestSha}  manifest.json\n`, 'utf8') });

      const zipBuf = await buildZip(filesForZip);

      const obj = returnInline ? undefined : await store(`ATHEEL_${body.packetId}_DeliveryBundle.zip`, 'application/zip', zipBuf);
      artifacts.push({
        name: `ATHEEL_${body.packetId}_DeliveryBundle.zip`,
        mimeType: 'application/zip',
        sizeBytes: zipBuf.length,
        sha256: sha256Hex(zipBuf),
        object: obj,
        base64: returnInline ? zipBuf.toString('base64') : undefined,
      });
    }

    return { ok: true, jobId: body.jobId, packetId: body.packetId, artifacts };
  }

  @Post('/internal/render')
  async render(
    @Headers('x-internal-token') token: string | undefined,
    @Headers('x-message-id') messageId: string | undefined,
    @Body() body: RenderRequest,
  ) {
    this.assertInternalToken(token);

    // Wave60: Idempotency بسيطة عبر تخزين نتيجة الرسالة في Object Store (بدون قاعدة بيانات)
    const mid = String(messageId || '').trim();
    if (mid) {
      const inboxKey = `inbox/exports_render/${mid}.json`;
      if (await this.objectStore.exists(inboxKey)) {
        return await this.objectStore.getJson(inboxKey);
      }
      const out = await this.doRender(body);
      await this.objectStore.putJson({ key: inboxKey, value: out }).catch(() => null);
      return out;
    }

    return await this.doRender(body);
  }

  @MessagePattern('exports.render')
  async renderMessage(@Payload() envelope: any, @Ctx() context: any) {
    const token = String(envelope?.internalToken || '');
    this.assertInternalToken(token);
    const body = envelope?.renderRequest as RenderRequest;
    const messageId = String(envelope?.messageId || '').trim();

    try {
      if (messageId) {
        const inboxKey = `inbox/exports_render/${messageId}.json`;
        if (await this.objectStore.exists(inboxKey)) {
          const cached = await this.objectStore.getJson(inboxKey);
          // RMQ manual ack when enabled
          if (context && typeof (context as RmqContext).getChannelRef === 'function') {
            const ch = (context as RmqContext).getChannelRef();
            const msg = (context as RmqContext).getMessage();
            if (ch && msg) ch.ack(msg);
          }
          return cached;
        }
        const out = await this.doRender(body);
        await this.objectStore.putJson({ key: inboxKey, value: out }).catch(() => null);
        // RMQ manual ack when enabled
        if (context && typeof (context as RmqContext).getChannelRef === 'function') {
          const ch = (context as RmqContext).getChannelRef();
          const msg = (context as RmqContext).getMessage();
          if (ch && msg) ch.ack(msg);
        }
        return out;
      }

      const out = await this.doRender(body);
      // RMQ manual ack when enabled
      if (context && typeof (context as RmqContext).getChannelRef === 'function') {
        const ch = (context as RmqContext).getChannelRef();
        const msg = (context as RmqContext).getMessage();
        if (ch && msg) ch.ack(msg);
      }
      return out;
    } catch (e) {
      if (context && typeof (context as RmqContext).getChannelRef === 'function') {
        const ch = (context as RmqContext).getChannelRef();
        const msg = (context as RmqContext).getMessage();
        if (ch && msg) ch.nack(msg, false, true);
      }
      throw e;
    }
  }
}
