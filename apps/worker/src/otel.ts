/* eslint-disable @typescript-eslint/no-var-requires */

function isEnabled() {
  const v = (process.env.OTEL_ENABLED || '').toString().toLowerCase();
  if (v) return v === 'true' || v === '1' || v === 'yes';
  const isProd = (process.env.NODE_ENV || '').toString().toLowerCase() === 'production';
  return isProd;
}

function boot() {
  if (!isEnabled()) return;
  try {
    const { NodeSDK } = require('@opentelemetry/sdk-node');
    const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');
    const serviceName = process.env.OTEL_SERVICE_NAME || 'atheel-worker';
    const sdk = new NodeSDK({
      serviceName,
      instrumentations: [getNodeAutoInstrumentations()],
    });
    sdk.start();
    process.on('SIGTERM', () => {
      sdk.shutdown().catch(() => undefined);
    });
  } catch {
    // ignore
  }
}

boot();
