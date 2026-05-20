/*
  Copies Cesium static assets (Workers, Widgets, Assets) into Next.js public folder.
  Needed because Cesium loads these resources at runtime.

  Target:
    apps/web/public/cesium

  Usage: runs automatically via apps/web/package.json postinstall.
*/

import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const projectRoot = resolve(__dirname, '..');
const publicDir = resolve(projectRoot, 'public');
const target = resolve(publicDir, 'cesium');

// Resolve cesium build folder from monorepo root node_modules.
const candidate = resolve(projectRoot, 'node_modules', 'cesium', 'Build', 'Cesium');

try {
  if (!existsSync(candidate)) {
    console.log('[cesium] Build folder not found:', candidate);
    console.log('[cesium] Skipping copy (install dependencies first).');
    process.exit(0);
  }

  if (!existsSync(publicDir)) mkdirSync(publicDir, { recursive: true });
  if (existsSync(target)) rmSync(target, { recursive: true, force: true });

  cpSync(candidate, target, { recursive: true });
  console.log('[cesium] Copied assets to', target);
} catch (e) {
  console.log('[cesium] Failed to copy assets:', e?.message || e);
  process.exit(0);
}
