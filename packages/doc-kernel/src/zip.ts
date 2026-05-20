import archiver from 'archiver';
import { PassThrough } from 'node:stream';
import type { ZipFile } from './types';

export async function buildZip(files: ZipFile[]): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const archive = archiver('zip', { zlib: { level: 9 } });
    const stream = new PassThrough();
    const chunks: Buffer[] = [];

    stream.on('data', (...args: unknown[]) => { const c = args[0] as Buffer | Uint8Array | string; chunks.push(Buffer.from(c)); });
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
    archive.on('error', reject);

    archive.pipe(stream);
    for (const f of files) {
      archive.append(f.buffer, { name: f.name });
    }
    archive.finalize().catch(reject);
  });
}
