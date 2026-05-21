import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { Transport, type MicroserviceOptions } from '@nestjs/microservices';
import { AppModule } from './app.module';

function normalizeChannel(v: string | undefined) {
  const x = String(v || '').trim().toLowerCase();
  if (!x) return 'http';
  if (x === 'rmq' || x === 'rabbitmq') return 'rmq';
  if (x === 'redis') return 'redis';
  if (x === 'http') return 'http';
  return 'http';
}

const logger = new Logger('Bootstrap');

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { logger: ['log', 'error', 'warn'] });

  const channel = normalizeChannel(process.env.EXPORTS_RENDERER_CHANNEL || process.env.EXPORTS_CHANNEL);
  if (channel === 'rmq') {
    const urls = [String(process.env.EXPORTS_RMQ_URL || process.env.RMQ_URL || 'amqp://guest:guest@localhost:5672')];
    const queue = String(process.env.EXPORTS_RMQ_QUEUE || 'atheel.exports.render');
    const prefetchCount = Number(process.env.EXPORTS_RMQ_PREFETCH || 1);

    app.connectMicroservice<MicroserviceOptions>({
      transport: Transport.RMQ,
      options: {
        urls,
        queue,
        queueOptions: { durable: true },
        noAck: false,
        prefetchCount,
      },
    });
  }

  if (channel === 'redis') {
    const host = String(process.env.EXPORTS_REDIS_HOST || process.env.REDIS_HOST || 'localhost');
    const port = Number(process.env.EXPORTS_REDIS_PORT || process.env.REDIS_PORT || 6379);
    app.connectMicroservice<MicroserviceOptions>({
      transport: Transport.REDIS,
      options: { host, port },
    });
  }

  await app.startAllMicroservices();
  const port = Number(process.env.EXPORTS_RENDERER_PORT || 3101);
  await app.listen(port);
  logger.log(`exports-svc listening on :${port}`);
}

bootstrap().catch((err) => {
  logger.error('exports-svc bootstrap failed', err instanceof Error ? err.stack : String(err));
  process.exit(1);
});
