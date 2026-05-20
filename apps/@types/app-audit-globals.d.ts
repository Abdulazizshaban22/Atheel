declare const process: {
  env: Record<string, string | undefined>;
  cwd(): string;
  on(event: string, listener: (...args: unknown[]) => void): void;
};

declare function require(moduleName: string): any;

declare interface Buffer extends Uint8Array {
  readonly length: number;
  toString(encoding?: string): string;
  slice(start?: number, end?: number): Buffer;
}

declare const Buffer: {
  from(value: string | Uint8Array, encoding?: string): Buffer;
  concat(list: readonly Buffer[]): Buffer;
  byteLength(value: string | Uint8Array): number;
  isBuffer(value: unknown): value is Buffer;
};

declare namespace NodeJS {
  interface ReadableStream {
    on(event: 'data', listener: (chunk: Buffer) => void): ReadableStream;
    on(event: 'error', listener: (error: unknown) => void): ReadableStream;
    on(event: 'end', listener: () => void): ReadableStream;
    destroy(error?: unknown): void;
    pipe<T>(destination: T): T;
  }
}

declare namespace React {
  type ReactNode = unknown;
  type ReactElement = unknown;
  interface MutableRefObject<T> { current: T }
  interface RefObject<T> { current: T | null }
  interface FormEvent<T = unknown> {
    preventDefault(): void;
    currentTarget: T;
    target: T;
  }
  interface DragEvent<T = unknown> extends FormEvent<T> {
    clientX: number;
    clientY: number;
    dataTransfer: {
      getData(format: string): string;
      setData(format: string, data: string): void;
      effectAllowed: string;
      dropEffect: string;
    };
  }
}

declare namespace JSX {
  interface Element {}
  interface ElementClass {}
  interface ElementAttributesProperty { props: {} }
  interface ElementChildrenAttribute { children: {} }
  interface IntrinsicElements { [elemName: string]: any }
}

declare module 'react' {
  export type ReactNode = React.ReactNode;
  export type ReactElement = React.ReactElement;
  export type FormEvent<T = unknown> = React.FormEvent<T>;
  export type DragEvent<T = unknown> = React.DragEvent<T>;
  export type MutableRefObject<T> = React.MutableRefObject<T>;
  export type RefObject<T> = React.RefObject<T>;
  export function useState<T>(initialState: T | (() => T)): [T, (value: T | ((previous: T) => T)) => void];
  export function useEffect(effect: () => void | (() => void | undefined) | Promise<void>, deps?: readonly unknown[]): void;
  export function useMemo<T>(factory: () => T, deps: readonly unknown[]): T;
  export function useCallback<T extends (...args: any[]) => any>(callback: T, deps: readonly unknown[]): T;
  export function useRef<T>(initialValue: T): MutableRefObject<T>;
  export function createElement(type: unknown, props?: unknown, ...children: unknown[]): ReactElement;
  export const Fragment: unknown;
}

declare module 'react/jsx-runtime' {
  export function jsx(type: unknown, props: unknown, key?: unknown): JSX.Element;
  export function jsxs(type: unknown, props: unknown, key?: unknown): JSX.Element;
  export const Fragment: unknown;
}

declare module 'next' {
  export interface Metadata {
    title?: string;
    description?: string;
    [key: string]: unknown;
  }
  export interface NextConfig {
    experimental?: Record<string, unknown>;
    webpack?: (config: any, options: { isServer?: boolean }) => any;
    [key: string]: unknown;
  }
}

declare module 'next/link' {
  export default function Link(props: { href: string; className?: string; children?: React.ReactNode; [key: string]: unknown }): JSX.Element;
}

declare module 'next/navigation' {
  export function usePathname(): string;
  export function useRouter(): { push(path: string): void; replace(path: string): void; refresh(): void };
  export function useSearchParams(): { get(key: string): string | null };
}

declare module 'next/server' {
  export class NextURL {
    pathname: string;
    searchParams: { set(key: string, value: string): void };
    clone(): NextURL;
  }
  export class NextRequest {
    nextUrl: NextURL;
    cookies: { get(name: string): { value: string } | undefined };
  }
  export class NextResponse {
    static next(): NextResponse;
    static redirect(url: NextURL): NextResponse;
  }
}

declare module 'jose' {
  export function jwtVerify(token: string, key: Uint8Array): Promise<{ payload: Record<string, unknown> }>;
}

declare module '@xyflow/react' {
  export type Position = 'top' | 'right' | 'bottom' | 'left';
  export type Node<T = any> = { id: string; type?: string; position?: { x: number; y: number }; data?: T; [key: string]: unknown };
  export type Edge<T = any> = { id: string; source: string; target: string; sourceHandle?: string | null; targetHandle?: string | null; type?: string; data?: T; [key: string]: unknown };
  export type Connection = { source?: string | null; target?: string | null; sourceHandle?: string | null; targetHandle?: string | null };
  export type NodeProps<T = any> = { id?: string; data?: T; selected?: boolean; isConnectable?: boolean };
  export function addEdge(connection: Edge | Connection, edges: Edge[]): Edge[];
  export function useEdgesState<T = any>(initialEdges: Edge<T>[]): [Edge<T>[], (changes: unknown) => void, (updater: Edge<T>[] | ((prev: Edge<T>[]) => Edge<T>[])) => void];
  export function useNodesState<T = any>(initialNodes: Node<T>[]): [Node<T>[], (changes: unknown) => void, (updater: Node<T>[] | ((prev: Node<T>[]) => Node<T>[])) => void];
  export function useReactFlow(): { fitView(options?: unknown): void; screenToFlowPosition(position: { x: number; y: number }): { x: number; y: number } };
  export function Handle(props: Record<string, unknown>): JSX.Element;
  export function Background(props?: Record<string, unknown>): JSX.Element;
  export function Controls(props?: Record<string, unknown>): JSX.Element;
  export function MiniMap(props?: Record<string, unknown>): JSX.Element;
  export function ReactFlowProvider(props: { children?: React.ReactNode }): JSX.Element;
  export default function ReactFlow(props: Record<string, unknown>): JSX.Element;
}

declare module '@xyflow/react/dist/style.css';
declare module '*.css';

declare module 'socket.io-client' {
  export function io(url: string, options?: Record<string, unknown>): { on(event: string, listener: (...args: unknown[]) => void): void; off(event: string, listener?: (...args: unknown[]) => void): void; emit(event: string, ...args: unknown[]): void; disconnect(): void };
}

declare module 'node:fs' {
  export type ReadStream = NodeJS.ReadableStream;
  export function readFileSync(path: string, encoding?: string): string;
  export function createReadStream(path: string): ReadStream;
  export function createWriteStream(path: string): { on(event: string, listener: (...args: unknown[]) => void): unknown };
  export function existsSync(path: string): boolean;
  export const promises: { mkdir(path: string, options?: { recursive?: boolean }): Promise<void>; writeFile(path: string, data: string | Uint8Array): Promise<void>; readFile(path: string, encoding?: string): Promise<string | Uint8Array>; rm(path: string, options?: { recursive?: boolean; force?: boolean }): Promise<void>; stat(path: string): Promise<{ size: number }>; copyFile(from: string, to: string): Promise<void> };
}

declare module 'node:path' {
  export function join(...paths: string[]): string;
  export function resolve(...paths: string[]): string;
  export function dirname(path: string): string;
  export function isAbsolute(path: string): boolean;
  export const sep: string;
}

declare module 'node:url' {
  export class URL {
    constructor(value: string, base?: string);
    pathname: string;
    searchParams: { set(key: string, value: string): void };
    toString(): string;
  }
}

declare module 'node:crypto' {
  export function createHash(algorithm: string): { update(value: string | Uint8Array): { digest(encoding?: string): string }; digest(encoding?: string): string };
  export function randomBytes(size: number): Buffer;
  export function randomUUID(): string;
}

declare module 'undici' {
  export function request(url: string, options?: { method?: string; headers?: Record<string, string>; body?: string }): Promise<{ statusCode: number; body: { text(): Promise<string> } }>;
}

declare module 'bullmq' {
  export type JobsOptions = { attempts?: number; backoff?: { type?: string; delay?: number } | number; removeOnComplete?: boolean | number; removeOnFail?: boolean | number };
  export class Job<T = any> { id?: string; name?: string; data: T; attemptsMade: number; opts?: JobsOptions }
  export class Worker<T = any> {
    constructor(name: string, processor: (job: Job<T>) => Promise<unknown>, options?: Record<string, unknown>);
    on(event: 'active' | 'completed' | 'failed' | 'error', listener: (...args: unknown[]) => void): Worker<T>;
    close(): Promise<void>;
  }
  export class QueueEvents {
    constructor(name: string, options?: Record<string, unknown>);
    on(event: string, listener: (...args: unknown[]) => void): QueueEvents;
    close(): Promise<void>;
  }
  export class Queue<T = any> {
    constructor(name: string, options?: Record<string, unknown>);
    add(name: string, data: T, options?: JobsOptions): Promise<Job<T>>;
    close(): Promise<void>;
  }
}

declare module 'ioredis' {
  export default class IORedis {
    constructor(url: string, options?: Record<string, unknown>);
    quit(): Promise<void>;
    ping(): Promise<string>;
  }
}

declare module '@nestjs/common' {
  export interface Type<T = unknown> extends Function { new (...args: any[]): T }
  export interface INestApplication { connectMicroservice<T = unknown>(options: T): unknown; startAllMicroservices(): Promise<void>; listen(port: number): Promise<void>; close(): Promise<void> }
  export function Module(metadata: Record<string, unknown>): ClassDecorator;
  export function Controller(path?: string): ClassDecorator;
  export function Injectable(): ClassDecorator;
  export function Headers(property?: string): ParameterDecorator;
  export function Post(path?: string): MethodDecorator;
  export function Get(path?: string): MethodDecorator;
  export function Body(...args: unknown[]): ParameterDecorator;
  export class UnauthorizedException extends Error { constructor(message?: string) }
  export class Logger { constructor(context?: string); log(message: unknown): void; error(message: unknown, trace?: unknown): void; warn(message: unknown): void }
}

declare module '@nestjs/core' {
  export const NestFactory: { create(module: unknown, options?: Record<string, unknown>): Promise<import('@nestjs/common').INestApplication> };
}

declare module '@nestjs/config' {
  export class ConfigModule { static forRoot(options?: Record<string, unknown>): unknown }
}

declare module '@nestjs/microservices' {
  export const Transport: { RMQ: number; TCP: number; REDIS: number };
  export function EventPattern(pattern: string): MethodDecorator;
  export function MessagePattern(pattern: string): MethodDecorator;
  export const Ctx: (...args: unknown[]) => ParameterDecorator;
  export const Payload: (...args: unknown[]) => ParameterDecorator;
  export interface RmqContext { getChannelRef(): { ack(message: unknown): void; nack(message: unknown, allUpTo?: boolean, requeue?: boolean): void }; getMessage(): unknown }
  export interface ClientProxy { send<T = unknown, R = unknown>(pattern: T, data: R): import('rxjs').Observable<unknown> }
  export interface MicroserviceOptions { transport?: number; options?: Record<string, unknown> }
}

declare module 'rxjs' {
  export interface Observable<T = unknown> { subscribe(next?: (value: T) => void): unknown; pipe(...operators: unknown[]): Observable<unknown> }
  export function firstValueFrom<T>(source: Observable<T>): Promise<T>;
  export function of<T>(value: T): Observable<T>;
}

declare module '@madar/object-store' {
  export interface StoredObjectDescriptor { bucket: string; key: string; url?: string | null; sizeBytes?: number | null; contentType?: string | null }
  export interface ObjectRef { bucket: string; key: string; url?: string | null }
  export interface ObjectStore { putBuffer(input: { key: string; buffer: Buffer; contentType?: string }): Promise<{ ref: ObjectRef }>; exists(key: string): Promise<boolean>; getJson(key: string): Promise<unknown>; putJson(input: { key: string; value: unknown }): Promise<unknown>; }
  export function createObjectStoreFromEnv(): ObjectStore;
  export function findRepoRootSync(): string;
  export class ObjectStoreService {
    saveBuffer(input: { key: string; buffer: Buffer; contentType?: string }): Promise<StoredObjectDescriptor>;
    putObject(input: { key: string; body: Buffer; contentType?: string }): Promise<StoredObjectDescriptor>;
  }
}

declare module '@madar/doc-kernel' {
  export interface GovTemplateMeta { [key: string]: unknown }
  export function buildPdfFromMarkdown(markdown: string, options?: Record<string, unknown>): Promise<Buffer>;
  export function buildPptxFromMarkdown(markdown: string, options?: Record<string, unknown>): Promise<Buffer>;
  export function buildZip(files: Array<{ name: string; buffer: Buffer }>): Promise<Buffer>;
  export function bundleExportArtifacts(input: Record<string, unknown>): Promise<{ bundle: Buffer; manifest: Record<string, unknown> }>;
}

declare module '@madar/twin-kernel' {
  export function simulateTwinFlow(input: Record<string, unknown>): Promise<Record<string, unknown>>;
}

declare module '@madar/packet-kernel' {
  export function buildApprovalPacketSections(input: Record<string, unknown>): Promise<Record<string, unknown>> | Record<string, unknown>;
}

declare module '@madar/innovation-kernel' {
  export function impactScore(input: Record<string, unknown>): number;
  export function riskScore(input: Record<string, unknown>): number;
}

declare module 'markdown-it' {
  export default class MarkdownIt {
    constructor(options?: Record<string, unknown>);
    parse(markdown: string, env?: Record<string, unknown>): Array<import('markdown-it/lib/token').default>;
  }
}

declare module 'markdown-it/lib/token' {
  export default class Token {
    type: string;
    tag: string;
    content: string;
    attrs?: Array<[string, string]>;
    children?: Token[];
  }
}

declare module 'puppeteer-core' { const puppeteer: any; export default puppeteer; }

declare module 'pptxgenjs' { const pptx: any; export default pptx; }

declare module 'archiver' { const archiver: any; export default archiver; }

declare module 'node:stream' { export class PassThrough { on(event: string, listener: (...args: unknown[]) => void): this; } }

declare module 'node:stream/promises' { export function pipeline(...streams: unknown[]): Promise<void>; }

declare module '@aws-sdk/client-s3' { const s3: any; export = s3; }

declare module 'pdf-parse' { const parsePdf: (input: Uint8Array | Buffer) => Promise<{ text?: string }>; export default parsePdf; }

declare module 'pdfjs-dist/legacy/build/pdf.js' { const pdfjs: any; export = pdfjs; }
