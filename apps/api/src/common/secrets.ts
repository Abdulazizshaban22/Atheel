import { readFileSync } from 'node:fs';

/**
 * Wave40: Secrets via *_FILE pattern (Docker / Swarm / Kubernetes)
 *
 * Example:
 *  AUTH_JWT_SECRET_FILE=/run/secrets/auth_jwt_secret
 */
export function loadSecretEnv(name: string) {
  const cur = (process.env[name] || '').toString().trim();
  if (cur) return cur;

  const fileVar = `${name}_FILE`;
  const filePath = (process.env[fileVar] || '').toString().trim();
  if (!filePath) return '';
  try {
    const v = readFileSync(filePath, 'utf-8').toString().trim();
    if (v) process.env[name] = v;
    return v;
  } catch {
    return '';
  }
}
