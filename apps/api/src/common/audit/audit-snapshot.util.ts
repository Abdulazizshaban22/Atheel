export function toAuditSnapshot(value: unknown, depth = 0): unknown {
  if (value === null || value === undefined) return value;
  if (depth > 3) return '[truncated]';

  if (Array.isArray(value)) {
    return value.slice(0, 20).map((item) => toAuditSnapshot(item, depth + 1));
  }

  if (typeof value !== 'object') {
    if (typeof value === 'string' && value.length > 500) {
      return `${value.slice(0, 500)}…`;
    }
    return value;
  }

  const input = value as Record<string, unknown>;
  const output: Record<string, unknown> = {};

  for (const [key, raw] of Object.entries(input)) {
    const lower = key.toLowerCase();
    if (
      lower.includes('password') ||
      lower.includes('token') ||
      lower.includes('secret') ||
      lower.includes('cookie') ||
      lower === 'file' ||
      lower === 'buffer'
    ) {
      output[key] = '[redacted]';
      continue;
    }

    output[key] = toAuditSnapshot(raw, depth + 1);
  }

  return output;
}
