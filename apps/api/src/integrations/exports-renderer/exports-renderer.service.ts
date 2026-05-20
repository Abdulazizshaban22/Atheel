import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ClientProxy, ClientProxyFactory, Transport, type MicroserviceOptions } from '@nestjs/microservices';
import { lastValueFrom, timeout as rxTimeout, type Observable } from 'rxjs';

import { getRequestContext } from '../../common/request-context';

export type ExportsRenderRequest = Record<string, unknown>;

export type ExportsRenderResponse = {
  ok: boolean;
  jobId?: string;
  packetId?: string;
  artifacts?: Array<{
    name: string;
    mimeType: string;
    sizeBytes: number;
    sha256: string;
    object?: { provider: 'local'; key: string };
    base64?: string;
  }>;
};

type RendererClient = ClientProxy & {
  send<TResult = unknown>(pattern: string, data: unknown): Observable<TResult>;
};

function normalizeChannel(v: string | undefined): 'http' | 'rmq' | 'redis' {
  const x = String(v || '').trim().toLowerCase();
  if (x === 'rmq' || x === 'rabbitmq') return 'rmq';
  if (x === 'redis') return 'redis';
  return 'http';
}

@Injectable()
export class ExportsRendererService implements OnModuleDestroy {
  private client: RendererClient | null = null;

  get channel(): 'http' | 'rmq' | 'redis' {
    return normalizeChannel(process.env.EXPORTS_RENDERER_CHANNEL || process.env.EXPORTS_CHANNEL);
  }

  private ensureClient(): RendererClient | null {
    if (this.client) return this.client;

    const channel = this.channel;
    if (channel === 'http') return null;

    if (channel === 'rmq') {
      const urls = [String(process.env.EXPORTS_RMQ_URL || process.env.RMQ_URL || 'amqp://guest:guest@localhost:5672')];
      const queue = String(process.env.EXPORTS_RMQ_QUEUE || 'atheel.exports.render');
      const prefetchCount = Number(process.env.EXPORTS_RMQ_PREFETCH || 1);

      this.client = ClientProxyFactory.create({
        transport: Transport.RMQ,
        options: {
          urls,
          queue,
          queueOptions: { durable: true },
          prefetchCount,
          persistent: true,
        },
      } as MicroserviceOptions) as RendererClient;

      return this.client;
    }

    const host = String(process.env.EXPORTS_REDIS_HOST || process.env.REDIS_HOST || 'localhost');
    const port = Number(process.env.EXPORTS_REDIS_PORT || process.env.REDIS_PORT || 6379);

    this.client = ClientProxyFactory.create({
      transport: Transport.REDIS,
      options: { host, port },
    } as MicroserviceOptions) as RendererClient;

    return this.client;
  }

  async renderViaTransport(params: {
    messageId: string;
    renderRequest: ExportsRenderRequest;
    timeoutMs?: number;
    correlationId?: string | null;
    traceparent?: string | null;
  }): Promise<ExportsRenderResponse> {
    const client = this.ensureClient();
    if (!client) throw new Error('exports_renderer_channel_http');

    const internalToken = String(process.env.EXPORTS_RENDERER_TOKEN || '').trim();
    if (!internalToken) throw new Error('missing EXPORTS_RENDERER_TOKEN');

    const ctx = getRequestContext();
    const correlationId = String(params.correlationId || ctx.correlationId || '').trim();
    const traceparent = String(params.traceparent || ctx.traceparent || '').trim();

    const envelope = {
      internalToken,
      messageId: params.messageId,
      correlationId: correlationId || undefined,
      traceparent: traceparent || undefined,
      renderRequest: params.renderRequest,
    };

    const ms = Number(params.timeoutMs || process.env.EXPORTS_RENDER_TIMEOUT_MS || 10 * 60_000);
    const observable = client.send<ExportsRenderResponse>('exports.render', envelope).pipe(rxTimeout(ms));
    return lastValueFrom(observable);
  }

  async onModuleDestroy() {
    try {
      await this.client?.close();
    } catch {
      // ignore
    }
  }
}
