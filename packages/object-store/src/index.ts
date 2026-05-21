import { createHash, randomUUID } from 'node:crypto';
import { createReadStream, createWriteStream, promises as fs } from 'node:fs';
import { dirname, isAbsolute, resolve, sep } from 'node:path';
import { pipeline } from 'node:stream/promises';

import { DeleteObjectCommand, GetObjectCommand, HeadObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

type JsonValue = Record<string, unknown> | Array<unknown> | string | number | boolean | null;
type LocalReadableStream = ReturnType<typeof createReadStream>;
type S3BodyChunk = Buffer | Uint8Array | string;
type S3GetObjectOutput = { Body?: AsyncIterable<S3BodyChunk> | LocalReadableStream };
type FsSyncLike = { existsSync(path: string): boolean };

function runtimeRequire<T>(moduleName: string): T {
  return require(moduleName) as T;
}

export type ObjectStoreProvider = 'local' | 's3';

export type ObjectRef = {
  provider: ObjectStoreProvider;
  key: string; // logical key inside the store
};

export type PutObjectResult = {
  ref: ObjectRef;
  sizeBytes: number;
  sha256: string;
  contentType?: string;
};

export type DownloadToFileParams = { key: string; absPath: string };

export interface ObjectStore {
  readonly provider: ObjectStoreProvider;
  exists(key: string): Promise<boolean>;
  putBuffer(params: { key?: string; buffer: Buffer; contentType?: string }): Promise<PutObjectResult>;
  putJson(params: { key: string; value: JsonValue }): Promise<PutObjectResult>;
  getBuffer(key: string): Promise<Buffer>;
  getJson<T = JsonValue>(key: string): Promise<T>;
  createReadStream(key: string): LocalReadableStream;
  downloadToFile(params: DownloadToFileParams): Promise<void>;
  /**
   * متاح فقط لـ local provider. للسواقات الأخرى سترمي خطأ.
   */
  resolveAbsPath?(key: string): string;
  remove(key: string): Promise<void>;
}

function sha256Hex(buf: Buffer) {
  return createHash('sha256').update(buf).digest('hex');
}

function sanitizeKey(key: string) {
  const k = String(key || '').trim().replace(/^\/+/, '');
  // منع أي مسارات خبيثة
  if (!k || k.includes('..') || k.includes('\\')) throw new Error('invalid_object_key');
  return k;
}

export class LocalObjectStore implements ObjectStore {
  readonly provider: ObjectStoreProvider = 'local';
  readonly baseDirAbs: string;

  constructor(params?: { baseDir?: string }) {
    const baseDir = String(params?.baseDir || process.env.OBJECT_STORE_DIR || 'runtime_object_store');
    const root = findRepoRootSync(process.cwd());
    this.baseDirAbs = isAbsolute(baseDir) ? resolve(baseDir) : resolve(root, baseDir);
  }

  private resolveKeyToPath(key: string) {
    const safeKey = sanitizeKey(key);
    const abs = resolve(this.baseDirAbs, safeKey);
    // حماية من path traversal
    if (!(abs === this.baseDirAbs || abs.startsWith(this.baseDirAbs + sep))) throw new Error('invalid_object_path');
    return abs;
  }

  async ensureBaseDir() {
    await fs.mkdir(this.baseDirAbs, { recursive: true });
  }

  async exists(key: string) {
    const abs = this.resolveKeyToPath(key);
    try {
      await fs.stat(abs);
      return true;
    } catch {
      return false;
    }
  }

  async putBuffer(params: { key?: string; buffer: Buffer; contentType?: string }): Promise<PutObjectResult> {
    await this.ensureBaseDir();
    const key = sanitizeKey(params.key || `objects/${new Date().toISOString().slice(0, 10)}/${randomUUID()}`);
    const abs = this.resolveKeyToPath(key);
    await fs.mkdir(dirname(abs), { recursive: true });
    await fs.writeFile(abs, params.buffer);
    return {
      ref: { provider: 'local', key },
      sizeBytes: params.buffer.length,
      sha256: sha256Hex(params.buffer),
      contentType: params.contentType,
    };
  }

  async putJson(params: { key: string; value: JsonValue }) {
    const buf = Buffer.from(JSON.stringify(params.value, null, 2), 'utf8');
    return await this.putBuffer({ key: params.key, buffer: buf, contentType: 'application/json' });
  }

  async getBuffer(key: string) {
    const abs = this.resolveKeyToPath(key);
    return Buffer.from(await fs.readFile(abs));
  }

  async getJson<T = JsonValue>(key: string): Promise<T> {
    const buf = await this.getBuffer(key);
    return JSON.parse(buf.toString('utf8')) as T;
  }

  createReadStream(key: string) {
    const abs = this.resolveKeyToPath(key);
    return createReadStream(abs);
  }

  resolveAbsPath(key: string) {
    return this.resolveKeyToPath(key);
  }

  async downloadToFile(params: DownloadToFileParams) {
    // local: مجرد نسخ من المسار المحلي
    const abs = this.resolveKeyToPath(params.key);
    await fs.mkdir(dirname(params.absPath), { recursive: true });
    await fs.copyFile(abs, params.absPath);
  }

  async remove(key: string) {
    const abs = this.resolveKeyToPath(key);
    await fs.rm(abs, { force: true });
  }
}

export class S3ObjectStore implements ObjectStore {
  readonly provider: ObjectStoreProvider = 's3';

  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly keyPrefix: string;

  constructor(params?: {
    endpoint?: string;
    region?: string;
    accessKeyId?: string;
    secretAccessKey?: string;
    bucket?: string;
    forcePathStyle?: boolean;
    keyPrefix?: string;
  }) {
    const endpoint = String(params?.endpoint || process.env.S3_ENDPOINT || '').trim();
    const region = String(params?.region || process.env.S3_REGION || 'us-east-1').trim();
    const accessKeyId = String(params?.accessKeyId || process.env.S3_ACCESS_KEY_ID || '').trim();
    const secretAccessKey = String(params?.secretAccessKey || process.env.S3_SECRET_ACCESS_KEY || '').trim();
    const bucket = String(params?.bucket || process.env.S3_BUCKET || '').trim();
    const fpsRaw = String(params?.forcePathStyle ?? process.env.S3_FORCE_PATH_STYLE ?? '1').trim();
    const forcePathStyle = fpsRaw === '1' || fpsRaw.toLowerCase() === 'true';
    const keyPrefix = String(params?.keyPrefix || process.env.S3_KEY_PREFIX || '').trim().replace(/^\/+/, '').replace(/\/+$/, '');

    if (!endpoint) throw new Error('missing S3_ENDPOINT');
    if (!accessKeyId || !secretAccessKey) throw new Error('missing S3 credentials');
    if (!bucket) throw new Error('missing S3_BUCKET');

    this.bucket = bucket;
    this.keyPrefix = keyPrefix;
    this.client = new S3Client({
      region,
      endpoint,
      forcePathStyle,
      credentials: { accessKeyId, secretAccessKey },
    });
  }

  private prefixedKey(key: string) {
    const safe = sanitizeKey(key);
    if (!this.keyPrefix) return safe;
    return `${this.keyPrefix}/${safe}`;
  }

  async exists(key: string) {
    const Key = this.prefixedKey(key);
    try {
      await this.client.send(new HeadObjectCommand({ Bucket: this.bucket, Key }));
      return true;
    } catch {
      return false;
    }
  }

  async putBuffer(params: { key?: string; buffer: Buffer; contentType?: string }): Promise<PutObjectResult> {
    const key = sanitizeKey(params.key || `objects/${new Date().toISOString().slice(0, 10)}/${randomUUID()}`);
    const Key = this.prefixedKey(key);

    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key,
        Body: params.buffer,
        ContentType: params.contentType,
      }),
    );

    return {
      ref: { provider: 's3', key },
      sizeBytes: params.buffer.length,
      sha256: sha256Hex(params.buffer),
      contentType: params.contentType,
    };
  }

  async putJson(params: { key: string; value: JsonValue }) {
    const buf = Buffer.from(JSON.stringify(params.value, null, 2), 'utf8');
    return await this.putBuffer({ key: params.key, buffer: buf, contentType: 'application/json' });
  }

  async getBuffer(key: string) {
    const Key = this.prefixedKey(key);
    const out = await this.client.send<S3GetObjectOutput>(new GetObjectCommand({ Bucket: this.bucket, Key }));
    const body = out.Body;
    if (!body) throw new Error('s3_missing_body');
    const streamBody = body as AsyncIterable<S3BodyChunk>;
    const chunks: Buffer[] = [];
    for await (const chunk of streamBody) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
  }

  async getJson<T = JsonValue>(key: string): Promise<T> {
    const buf = await this.getBuffer(key);
    return JSON.parse(buf.toString('utf8')) as T;
  }

  createReadStream(_key: string): never {
    // GetObjectCommand سيتطلب async لإرجاع stream، لذا نغلقه لتجنب التباس الاستخدام.
    // استخدم downloadToFile في الاستهلاك.
    throw new Error('s3_createReadStream_not_supported_use_downloadToFile');
  }

  async downloadToFile(params: DownloadToFileParams) {
    const Key = this.prefixedKey(params.key);
    const out = await this.client.send<S3GetObjectOutput>(new GetObjectCommand({ Bucket: this.bucket, Key }));
    const body = out.Body;
    if (!body) throw new Error('s3_missing_body');
    await fs.mkdir(dirname(params.absPath), { recursive: true });
    const ws = createWriteStream(params.absPath);
    await pipeline(body as AsyncIterable<S3BodyChunk>, ws);
  }

  async remove(key: string) {
    const Key = this.prefixedKey(key);
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key })).catch(() => null);
  }
}

export function createObjectStoreFromEnv(): ObjectStore {
  const provider = String(process.env.OBJECT_STORE_PROVIDER || 'local').trim().toLowerCase();
  if (provider === 's3' || provider === 'minio') return new S3ObjectStore();
  return new LocalObjectStore();
}

export function getObjectStore() {
  return createObjectStoreFromEnv();
}

// utility export (sync) to locate monorepo root
export function findRepoRootSync(startDir?: string) {
  let cur = resolve(startDir || process.cwd());
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const fss = runtimeRequire<FsSyncLike>('node:fs');
      if (fss.existsSync(resolve(cur, 'pnpm-workspace.yaml'))) return cur;
    } catch {
      // ignore
    }
    const parent = resolve(cur, '..');
    if (parent === cur) return resolve(startDir || process.cwd());
    cur = parent;
  }
}
