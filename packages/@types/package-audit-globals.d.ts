declare class Buffer extends Uint8Array {
  static from(input: string | Uint8Array | ArrayBufferLike, encoding?: string): Buffer;
  static isBuffer(value: unknown): value is Buffer;
  static concat(list: readonly Uint8Array[]): Buffer;
  static byteLength(input: string | Uint8Array | ArrayBufferLike, encoding?: string): number;
  toString(encoding?: string): string;
}

declare const process: {
  env: Record<string, string | undefined>;
  cwd(): string;
};

declare function require(moduleName: string): unknown;

declare module 'node:crypto' {
  export function createHash(algorithm: string): { update(input: string | Uint8Array): { digest(encoding: 'hex'): string } };
  export function randomUUID(): string;
}

declare module 'node:path' {
  export function dirname(path: string): string;
  export function isAbsolute(path: string): boolean;
  export function resolve(...paths: string[]): string;
  export const sep: string;
}

declare module 'node:fs' {
  export const promises: {
    mkdir(path: string, options?: { recursive?: boolean }): Promise<void>;
    stat(path: string): Promise<unknown>;
    writeFile(path: string, data: Uint8Array | string): Promise<void>;
    readFile(path: string): Promise<Uint8Array>;
    copyFile(from: string, to: string): Promise<void>;
    rm(path: string, options?: { recursive?: boolean; force?: boolean }): Promise<void>;
  };
  export function createReadStream(path: string): ReadableLike;
  export function createWriteStream(path: string): WritableLike;
  export type ReadStream = ReadableLike;
}

declare module 'node:stream' {
  export class PassThrough {
    on(event: string, listener: (...args: unknown[]) => void): this;
  }
}

declare module 'node:stream/promises' {
  export function pipeline(input: AsyncIterable<Uint8Array | string | Buffer> | ReadableLike, output: WritableLike): Promise<void>;
}

interface ReadableLike {
  on?(event: string, listener: (...args: unknown[]) => void): unknown;
}

interface WritableLike {
  on?(event: string, listener: (...args: unknown[]) => void): unknown;
}

declare module '@aws-sdk/client-s3' {
  export class S3Client {
    constructor(options?: Record<string, unknown>);
    send<T = unknown>(command: unknown): Promise<T>;
  }
  export class PutObjectCommand { constructor(input: Record<string, unknown>); }
  export class GetObjectCommand { constructor(input: Record<string, unknown>); }
  export class HeadObjectCommand { constructor(input: Record<string, unknown>); }
  export class DeleteObjectCommand { constructor(input: Record<string, unknown>); }
}

declare module 'markdown-it/lib/token' {
  export default interface Token {
    type: string;
    tag: string;
    content: string;
  }
}

declare module 'markdown-it' {
  import type Token from 'markdown-it/lib/token';
  export default class MarkdownIt {
    constructor(options?: Record<string, unknown>);
    render(markdown: string): string;
    parse(markdown: string, env: Record<string, unknown>): Token[];
  }
}

declare module 'pptxgenjs' {
  interface SlideLike {
    addText(text: string, options?: Record<string, unknown>): void;
    addShape(shapeType: string, options?: Record<string, unknown>): void;
    addImage(options: Record<string, unknown>): void;
    __meta?: unknown;
  }

  class PptxGenJS {
    static ShapeType: { rect: string };
    layout: string;
    author: string;
    company: string;
    subject: string;
    addSlide(): SlideLike;
    write(kind: 'nodebuffer'): Promise<Uint8Array | Buffer>;
  }

  export default PptxGenJS;
}

declare module 'puppeteer-core' {
  export function launch(options?: Record<string, unknown>): Promise<{
    newPage(): Promise<{
      setContent(html: string, options?: Record<string, unknown>): Promise<void>;
      pdf(options?: Record<string, unknown>): Promise<Uint8Array | Buffer>;
    }>;
    close(): Promise<void>;
  }>;
}

declare module 'archiver' {
  interface ArchiveLike {
    append(data: Uint8Array | string, options: { name: string }): void;
    pipe(stream: unknown): void;
    finalize(): Promise<void>;
    on(event: string, listener: (...args: unknown[]) => void): void;
  }
  export default function archiver(format: string, options?: Record<string, unknown>): ArchiveLike;
}
