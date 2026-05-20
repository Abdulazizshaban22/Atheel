/**
 * Wave47: Observability bootstrap (OpenTelemetry) with optional OTLP exporters + correlation.
 *
 * Design goals:
 * - Safe-by-default: if deps are not installed OR OTEL is disabled, do nothing.
 * - Production-ready: supports OTLP (HTTP) traces + metrics when exporter deps are installed.
 * - Correlation: honors X-Correlation-Id header and surfaces it as attribute when possible (via instrumentation).
 */

/* eslint-disable @typescript-eslint/no-var-requires */

type RequireFn = (moduleName: string) => unknown;

type OtelApiModule = {
  diag: { setLogger(logger: unknown, level: unknown): void };
  DiagConsoleLogger: new () => unknown;
  DiagLogLevel: { INFO: unknown };
};

type OtelSdkNodeModule = {
  NodeSDK: new (options: Record<string, unknown>) => {
    start(): void;
    shutdown(): Promise<void>;
  };
};

type OtelAutoInstrumentationModule = {
  getNodeAutoInstrumentations(): unknown[];
};

type OtelResourcesModule = {
  Resource: new (attributes: Record<string, unknown>) => unknown;
};

type OtelSemanticConventionsModule = {
  SEMRESATTRS_SERVICE_NAME: string;
  SEMRESATTRS_DEPLOYMENT_ENVIRONMENT: string;
};

type OtelTraceExporterModule = {
  OTLPTraceExporter: new (options: { url: string; headers: Record<string, string> }) => unknown;
};

type OtelMetricExporterModule = {
  OTLPMetricExporter: new (options: { url: string; headers: Record<string, string> }) => unknown;
};

type OtelSdkMetricsModule = {
  PeriodicExportingMetricReader: new (options: { exporter: unknown; exportIntervalMillis: number }) => unknown;
};

function runtimeRequire<T>(moduleName: string): T {
  return (require as RequireFn)(moduleName) as T;
}

function isEnabled() {
  const v = (process.env.OTEL_ENABLED || '').toString().toLowerCase();
  if (v) return v === 'true' || v === '1' || v === 'yes';
  const isProd = (process.env.NODE_ENV || '').toString().toLowerCase() === 'production';
  return isProd;
}

function parseHeaders(raw?: string) {
  const v = (raw || '').trim();
  if (!v) return {};
  const out: Record<string, string> = {};
  for (const part of v.split(',')) {
    const [k, ...rest] = part.split('=');
    const key = (k || '').trim();
    const val = rest.join('=').trim();
    if (key) out[key] = val;
  }
  return out;
}

function boot() {
  if (!isEnabled()) return;

  try {
    const { NodeSDK } = runtimeRequire<OtelSdkNodeModule>('@opentelemetry/sdk-node');
    const { getNodeAutoInstrumentations } = runtimeRequire<OtelAutoInstrumentationModule>('@opentelemetry/auto-instrumentations-node');
    const { diag, DiagConsoleLogger, DiagLogLevel } = runtimeRequire<OtelApiModule>('@opentelemetry/api');
    const { Resource } = runtimeRequire<OtelResourcesModule>('@opentelemetry/resources');
    const { SEMRESATTRS_SERVICE_NAME, SEMRESATTRS_DEPLOYMENT_ENVIRONMENT } =
      runtimeRequire<OtelSemanticConventionsModule>('@opentelemetry/semantic-conventions');

    if ((process.env.OTEL_DIAG || '').toString().toLowerCase() === 'true') {
      diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.INFO);
    }

    const serviceName = process.env.OTEL_SERVICE_NAME || process.env.SERVICE_NAME || 'atheel-api';
    const environment = (process.env.NODE_ENV || 'development').toString();

    const otlpEndpoint = (process.env.OTEL_EXPORTER_OTLP_ENDPOINT || '').toString().trim();
    const otlpHeaders = parseHeaders(process.env.OTEL_EXPORTER_OTLP_HEADERS);

    let traceExporter: unknown = undefined;
    let metricReader: unknown = undefined;

    if (otlpEndpoint) {
      try {
        const { OTLPTraceExporter } = runtimeRequire<OtelTraceExporterModule>('@opentelemetry/exporter-trace-otlp-http');
        traceExporter = new OTLPTraceExporter({ url: `${otlpEndpoint.replace(/\/+$/, '')}/v1/traces`, headers: otlpHeaders });
      } catch {
        // exporter dependency is optional in audit mode
      }

      try {
        const { OTLPMetricExporter } = runtimeRequire<OtelMetricExporterModule>('@opentelemetry/exporter-metrics-otlp-http');
        const { PeriodicExportingMetricReader } = runtimeRequire<OtelSdkMetricsModule>('@opentelemetry/sdk-metrics');
        const exporter = new OTLPMetricExporter({ url: `${otlpEndpoint.replace(/\/+$/, '')}/v1/metrics`, headers: otlpHeaders });
        metricReader = new PeriodicExportingMetricReader({
          exporter,
          exportIntervalMillis: Math.max(5000, Number(process.env.OTEL_METRICS_EXPORT_INTERVAL_MS || 10000)),
        });
      } catch {
        // exporter dependency is optional in audit mode
      }
    }

    const sdk = new NodeSDK({
      resource: new Resource({
        [SEMRESATTRS_SERVICE_NAME]: serviceName,
        [SEMRESATTRS_DEPLOYMENT_ENVIRONMENT]: environment,
      }),
      traceExporter,
      metricReader,
      instrumentations: [getNodeAutoInstrumentations()],
    });

    sdk.start();

    process.on('SIGTERM', () => {
      sdk.shutdown().catch(() => undefined);
    });
  } catch {
    // deps not installed or boot failed; ignore to avoid breaking runtime
  }
}

boot();
