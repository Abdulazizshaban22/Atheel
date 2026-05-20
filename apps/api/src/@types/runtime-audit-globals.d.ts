declare const process: {
  env: Record<string, string | undefined>;
  cwd(): string;
  uptime(): number;
  on(event: string, listener: (...args: unknown[]) => void): void;
};


declare function require(moduleName: string): unknown;

declare const console: {
  log(...args: unknown[]): void;
  error(...args: unknown[]): void;
  warn(...args: unknown[]): void;
  info(...args: unknown[]): void;
};

declare interface Buffer extends Uint8Array {
  readonly length: number;
  toString(encoding?: string): string;
  slice(start?: number, end?: number): Buffer;
}

declare const Buffer: {
  isBuffer(value: unknown): value is Buffer;
  byteLength(value: string | Uint8Array): number;
  from(value: string | Uint8Array, encoding?: string): Buffer;
  concat(list: readonly Buffer[]): Buffer;
};

declare module 'node:async_hooks' {
  export class AsyncLocalStorage<T> {
    disable(): void;
    getStore(): T | undefined;
    run<R>(store: T, callback: () => R): R;
    enterWith(store: T): void;
  }
}

declare module 'node:crypto' {
  export function randomUUID(): string;
  export function randomBytes(size: number): Buffer;
  export function createHash(algorithm: string): {
    update(data: string | Uint8Array): { digest(encoding?: string): string };
    digest(encoding?: string): string;
  };
  export function scryptSync(password: string | Uint8Array, salt: string | Uint8Array, keylen: number): Buffer;
  export function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean;
  const cryptoDefault: {
    randomUUID: typeof randomUUID;
    randomBytes: typeof randomBytes;
    createHash: typeof createHash;
    scryptSync: typeof scryptSync;
    timingSafeEqual: typeof timingSafeEqual;
  };
  export default cryptoDefault;
}

declare module 'crypto' {
  export * from 'node:crypto';
  import cryptoDefault from 'node:crypto';
  export default cryptoDefault;
}

declare module 'node:path' {
  export function resolve(...paths: string[]): string;
  export function join(...paths: string[]): string;
  export function dirname(path: string): string;
  export function basename(path: string, suffix?: string): string;
  export function extname(path: string): string;
  export function isAbsolute(path: string): boolean;
  export const sep: string;
  const pathDefault: {
    resolve: typeof resolve;
    join: typeof join;
    dirname: typeof dirname;
    basename: typeof basename;
    extname: typeof extname;
    isAbsolute: typeof isAbsolute;
    sep: typeof sep;
  };
  export default pathDefault;
}

declare module 'node:fs' {
  export type ReadStream = {
    on(event: 'data', listener: (chunk: Buffer) => void): ReadStream;
    on(event: 'error', listener: (error: unknown) => void): ReadStream;
    on(event: 'end', listener: () => void): ReadStream;
    destroy(error?: unknown): void;
  };

  export function readFileSync(path: string, encoding?: string): string;
  export function createReadStream(path: string): ReadStream;
  export function createWriteStream(path: string): unknown;
  export function existsSync(path: string): boolean;
  export const promises: {
    mkdir(path: string, options?: { recursive?: boolean }): Promise<void>;
    writeFile(path: string, data: string | Uint8Array): Promise<void>;
    readFile(path: string, encoding?: string): Promise<string | Uint8Array>;
    stat(path: string): Promise<{ size: number }>;
    copyFile(source: string, destination: string): Promise<void>;
    rm(path: string, options?: { force?: boolean }): Promise<void>;
  };
  const fsDefault: {
    readFileSync: typeof readFileSync;
    createReadStream: typeof createReadStream;
    createWriteStream: typeof createWriteStream;
    existsSync: typeof existsSync;
    promises: typeof promises;
  };
  export default fsDefault;
}

declare module 'yauzl' {
  export type Entry = {
    fileName?: string;
    uncompressedSize?: number;
  };

  export type ZipFile = {
    readEntry(): void;
    close(): void;
    openReadStream(entry: Entry, callback: (error: unknown, stream: import('node:fs').ReadStream | undefined) => void): void;
    on(event: 'entry', listener: (entry: Entry) => void): ZipFile;
    on(event: 'end', listener: () => void): ZipFile;
    on(event: 'error', listener: (error: unknown) => void): ZipFile;
  };

  export function fromBuffer(
    buffer: Buffer,
    options: { lazyEntries?: boolean; decodeStrings?: boolean },
    callback: (error: unknown, zipFile: ZipFile | undefined) => void,
  ): void;
}

declare module 'qrcode' {
  export function toDataURL(value: string, options?: { margin?: number; width?: number }): Promise<string>;
}


declare module '@nestjs/config' {
  export class ConfigService {
    get<T = string>(key: string): T | undefined;
  }
  export class ConfigModule {
    static forRoot(options?: Record<string, unknown>): unknown;
  }
}

declare module '@nestjs/jwt' {
  export interface JwtSignOptions { secret?: string; expiresIn?: string | number }
  export class JwtModule { static register(options?: Record<string, unknown>): unknown }
  export class JwtService {
    sign(payload: unknown, options?: JwtSignOptions): string;
    verify<T = unknown>(token: string, options?: { secret?: string }): T;
  }
}

declare module '@nestjs/common' {
  export type Type<T = unknown> = new (...args: unknown[]) => T;
  export interface INestApplication { close(): Promise<void> }
  export interface ExecutionContext { switchToHttp(): { getRequest<T = unknown>(): T; getResponse<T = unknown>(): T }; getHandler(): unknown; getClass(): unknown; getType<TContext extends string = string>(): TContext }
  export interface ArgumentsHost { switchToHttp(): { getRequest<T = unknown>(): T; getResponse<T = unknown>(): T } }
  export interface CallHandler<T = unknown> { handle(): import('rxjs').Observable<T> }
  export interface NestInterceptor<T = unknown, R = unknown> { intercept(context: ExecutionContext, next: CallHandler<T>): R }
  export interface CanActivate { canActivate(context: ExecutionContext): boolean | Promise<boolean> }
  export interface ExceptionFilter<T = unknown> { catch(exception: T, host: ArgumentsHost): unknown }
  export interface OnModuleInit { onModuleInit(): unknown }
  export interface OnModuleDestroy { onModuleDestroy(): unknown }
  export interface PipeTransform<T = unknown, R = unknown> { transform(value: T, metadata: ArgumentMetadata): R }
  export interface ArgumentMetadata { type?: string; metatype?: unknown; data?: string }
  export const Scope: { DEFAULT: number; REQUEST: number; TRANSIENT: number };
  export enum HttpStatus { OK = 200, BAD_REQUEST = 400, UNAUTHORIZED = 401, FORBIDDEN = 403, NOT_FOUND = 404, CONFLICT = 409, INTERNAL_SERVER_ERROR = 500, SERVICE_UNAVAILABLE = 503 }
  export class HttpException extends Error { constructor(message?: unknown, status?: number); getStatus(): number; getResponse(): unknown }
  export class BadRequestException extends HttpException {}
  export class NotFoundException extends HttpException {}
  export class ForbiddenException extends HttpException {}
  export class UnauthorizedException extends HttpException {}
  export class ConflictException extends HttpException {}
  export class ServiceUnavailableException extends HttpException {}
  export class InternalServerErrorException extends HttpException {}
  export class ValidationPipe { constructor(options?: Record<string, unknown>) }
  export class Logger { constructor(context?: string); log(message: unknown): void; error(message: unknown, trace?: unknown): void; warn(message: unknown): void }
  export class ParseUUIDPipe { constructor(options?: Record<string, unknown>) }
  export class ParseIntPipe { constructor(options?: Record<string, unknown>) }
  export class StreamableFile { constructor(value: unknown, options?: Record<string, unknown>) }
  export function Injectable(options?: Record<string, unknown>): ClassDecorator;
  export function Module(options: Record<string, unknown>): ClassDecorator;
  export function Controller(prefix?: string | string[]): ClassDecorator;
  export function Global(): ClassDecorator;
  export function Catch(...exceptions: Type[]): ClassDecorator;
  export function Get(path?: string): MethodDecorator;
  export function Post(path?: string): MethodDecorator;
  export function Patch(path?: string): MethodDecorator;
  export function Put(path?: string): MethodDecorator;
  export function Delete(path?: string): MethodDecorator;
  export function Header(name: string, value: string): MethodDecorator;
  export function SetMetadata(metadataKey: string, metadataValue: unknown): CustomDecorator<string>;
  export function UseGuards(...guards: (CanActivate | Type<CanActivate>)[]): MethodDecorator & ClassDecorator;
  export function UseInterceptors(...interceptors: unknown[]): MethodDecorator & ClassDecorator;
  export function UsePipes(...pipes: unknown[]): MethodDecorator & ClassDecorator;
  export function Req(options?: Record<string, unknown>): ParameterDecorator;
  export function Res(options?: Record<string, unknown>): ParameterDecorator;
  export function Body(property?: string): ParameterDecorator;
  export function Param(property?: string): ParameterDecorator;
  export function Query(property?: string): ParameterDecorator;
  export function Headers(property?: string): ParameterDecorator;
  export function Header(name: string, value: string): MethodDecorator;
  export function UploadedFile(...pipes: unknown[]): ParameterDecorator;
  export function Inject(token: unknown): ParameterDecorator & PropertyDecorator;
  export function forwardRef(factory: () => unknown): unknown;
  export function createParamDecorator<TData = unknown, TFactory extends (data: TData, ctx: ExecutionContext) => unknown = (data: TData, ctx: ExecutionContext) => unknown>(factory: TFactory): (data?: TData) => ParameterDecorator;
  export function applyDecorators(...decorators: Array<ClassDecorator | MethodDecorator | PropertyDecorator | ParameterDecorator>): MethodDecorator & ClassDecorator;
  export type CustomDecorator<T = string> = MethodDecorator & ClassDecorator & PropertyDecorator & ParameterDecorator;
}

declare module 'class-validator' {
  type ValidatorDecorator = (...args: unknown[]) => PropertyDecorator;
  export const IsString: ValidatorDecorator;
  export const IsOptional: ValidatorDecorator;
  export const IsIn: ValidatorDecorator;
  export const IsArray: ValidatorDecorator;
  export const IsObject: ValidatorDecorator;
  export const Min: ValidatorDecorator;
  export const Max: ValidatorDecorator;
  export const IsBoolean: ValidatorDecorator;
  export const IsInt: ValidatorDecorator;
  export const MaxLength: ValidatorDecorator;
  export const MinLength: ValidatorDecorator;
  export const IsNumber: ValidatorDecorator;
  export const ValidateNested: ValidatorDecorator;
  export const IsDateString: ValidatorDecorator;
  export const IsEmail: ValidatorDecorator;
  export const ArrayMaxSize: ValidatorDecorator;
  export const ArrayMinSize: ValidatorDecorator;
  export const Matches: ValidatorDecorator;
}

declare module '@nestjs/swagger' {
  type DecoratorFactory = (...args: unknown[]) => MethodDecorator & ClassDecorator & PropertyDecorator;
  export const ApiTags: DecoratorFactory;
  export const ApiBearerAuth: DecoratorFactory;
  export const ApiProperty: DecoratorFactory;
  export const ApiPropertyOptional: DecoratorFactory;
  export const ApiConsumes: DecoratorFactory;
  export const ApiOperation: DecoratorFactory;
  export const ApiResponse: DecoratorFactory;
  export class DocumentBuilder {
    setTitle(title: string): DocumentBuilder;
    setDescription(description: string): DocumentBuilder;
    setVersion(version: string): DocumentBuilder;
    addBearerAuth(): DocumentBuilder;
    build(): Record<string, unknown>;
  }
  export const SwaggerModule: {
    createDocument(app: unknown, config: unknown): unknown;
    setup(path: string, app: unknown, document: unknown, options?: Record<string, unknown>): void;
  };
}

declare module '@prisma/client' {
  export namespace Prisma {
    export interface ModelDelegate {
      findMany(args?: Record<string, unknown>): Promise<Array<Record<string, unknown>>>;
      findUnique(args: Record<string, unknown>): Promise<Record<string, unknown> | null>;
      create(args: { data: Record<string, unknown> }): Promise<Record<string, unknown>>;
      update(args: { where: Record<string, unknown>; data: Record<string, unknown> }): Promise<Record<string, unknown>>;
      delete(args: { where: Record<string, unknown> }): Promise<unknown>;
      upsert?(args: Record<string, unknown>): Promise<Record<string, unknown>>;
      count?(args?: Record<string, unknown>): Promise<number>;
    }
    export interface TransactionClient {
      auditLog: { create(args: { data: unknown }): Promise<unknown> };
      project: ModelDelegate;
      contentItem: ModelDelegate;
      visitorExperience: ModelDelegate;
      approvalRequest: ModelDelegate;
    }
    export type ProjectUncheckedCreateInput = Record<string, unknown>;
    export type ProjectUncheckedUpdateInput = Record<string, unknown>;
    export type ContentItemUncheckedCreateInput = Record<string, unknown>;
    export type ContentItemUncheckedUpdateInput = Record<string, unknown>;
    export type VisitorExperienceUncheckedCreateInput = Record<string, unknown>;
    export type VisitorExperienceUncheckedUpdateInput = Record<string, unknown>;
  }
  export type Project = Record<string, unknown>;
  export class PrismaClient {
    auditLog: { create(args: { data: unknown }): Promise<unknown> };
    visitorExperience: Prisma.ModelDelegate;
    contentItem: Prisma.ModelDelegate;
    approvalRequest: Prisma.ModelDelegate;
    project: Prisma.ModelDelegate;
    $connect(): Promise<void>;
    $on(event: string, listener: (...args: unknown[]) => unknown): void;
    $transaction<T>(fn: (tx: Prisma.TransactionClient & Record<string, unknown>) => Promise<T>): Promise<T>;
  }
}


declare module '@nestjs/core' {
  export interface NestApplicationLike {
    use(...args: unknown[]): void;
    useGlobalPipes(...pipes: unknown[]): void;
    useGlobalFilters(...filters: unknown[]): void;
    setGlobalPrefix(prefix: string): void;
    enableCors(options?: Record<string, unknown>): void;
    get<T = unknown>(token: unknown): T;
    getHttpAdapter(): { getInstance(): unknown };
    listen(port: number): Promise<void>;
    close(): Promise<void>;
  }
  export const NestFactory: { create(module: unknown, options?: Record<string, unknown>): Promise<NestApplicationLike> };
  export class Reflector {
    getAllAndOverride<T = unknown>(metadataKey: string, targets: unknown[]): T | undefined;
    get<T = unknown>(metadataKey: string, target: unknown): T | undefined;
  }
  export const APP_GUARD: symbol;
  export const APP_INTERCEPTOR: symbol;
}

declare module '@nestjs/throttler' {
  export class ThrottlerGuard {}
  export class ThrottlerModule {
    static forRoot(options?: Record<string, unknown>): unknown;
  }
  export function Throttle(options: Record<string, unknown>): MethodDecorator & ClassDecorator;
  export function SkipThrottle(options?: Record<string, unknown>): MethodDecorator & ClassDecorator;
}

declare module '@nest-lab/throttler-storage-redis' {
  export class ThrottlerStorageRedisService {
    constructor(connection: unknown);
  }
}

declare module '@nestjs/platform-express' {
  export function FileInterceptor(fieldName?: string, options?: Record<string, unknown>): MethodDecorator & ClassDecorator;
}

declare module '@nestjs/microservices' {
  export enum Transport { RMQ = 'RMQ', REDIS = 'REDIS' }
  export type MicroserviceOptions = Record<string, unknown>;
  export class ClientProxy {
    emit(pattern: string, data: unknown): { toPromise(): Promise<unknown> };
    send<TResult = unknown>(pattern: string, data: unknown): import('rxjs').Observable<TResult>;
    close(): void | Promise<void>;
  }
  export const ClientProxyFactory: {
    create(options: MicroserviceOptions): ClientProxy;
  };
}

declare module '@nestjs/websockets' {
  export function WebSocketGateway(portOrOptions?: number | Record<string, unknown>, options?: Record<string, unknown>): ClassDecorator;
  export function WebSocketServer(): PropertyDecorator;
  export function SubscribeMessage(message?: string): MethodDecorator;
  export interface OnGatewayInit { afterInit(server: unknown): unknown }
  export interface OnGatewayConnection { handleConnection(client: unknown, ...args: unknown[]): unknown }
  export interface OnGatewayDisconnect { handleDisconnect(client: unknown): unknown }
  export function MessageBody(): ParameterDecorator;
  export function ConnectedSocket(): ParameterDecorator;
}

declare module 'rxjs' {
  export interface Observable<T = unknown> {
    pipe<R = T>(...operators: Array<(source: Observable<T>) => Observable<R>>): Observable<R>;
  }
  export function from<T = unknown>(value: Promise<T> | T): Observable<T>;
  export function lastValueFrom<T = unknown>(value: Observable<T>): Promise<T>;
  export function timeout(ms: number): <T>(source: Observable<T>) => Observable<T>;
}

declare module 'rxjs/operators' {
  export function map<T = unknown, R = unknown>(project: (value: T) => R): (source: import('rxjs').Observable<T>) => import('rxjs').Observable<R>;
  export function mergeMap<T = unknown, R = unknown>(project: (value: T) => import('rxjs').Observable<R>): (source: import('rxjs').Observable<T>) => import('rxjs').Observable<R>;
}

declare module 'class-transformer' {
  export function Type(factory?: (...args: unknown[]) => unknown): PropertyDecorator;
  export function Transform(factory: (...args: unknown[]) => unknown): PropertyDecorator;
  export function plainToInstance<T>(cls: new (...args: unknown[]) => T, plain: unknown): T;
}

declare module 'socket.io' {
  export interface Socket {
    id: string;
    emit(event: string, ...args: unknown[]): boolean;
    join(room: string): Promise<void> | void;
    leave(room: string): Promise<void> | void;
    handshake?: { query?: Record<string, unknown> };
  }
  export class Server {
    emit(event: string, ...args: unknown[]): boolean;
    to(room: string): Server;
  }
}

declare module 'cookie-parser' {
  type CookieParser = (secret?: string | string[]) => unknown;
  const cookieParser: CookieParser;
  export default cookieParser;
}

declare module 'markdown-it' {
  export default class MarkdownIt {
    constructor(options?: Record<string, unknown>);
    render(value: string): string;
    parse(value: string, env?: Record<string, unknown>): Array<import('markdown-it/lib/token').default>;
  }
}

declare module 'markdown-it/lib/token' {
  export default class Token {
    type: string;
    tag: string;
    content: string;
    attrs?: Array<[string, string]>;
  }
}

declare module 'puppeteer-core' {
  export interface PDFOptions extends Record<string, unknown> {}
  export interface Page { setContent(html: string, options?: Record<string, unknown>): Promise<void>; pdf(options?: PDFOptions): Promise<Uint8Array>; close(): Promise<void> }
  export interface Browser { newPage(): Promise<Page>; close(): Promise<void> }
  export function launch(options?: Record<string, unknown>): Promise<Browser>;
}

declare module 'pptxgenjs' {
  export const ShapeType: Record<string, string>;
  export default class PptxGenJS {
    static ShapeType: Record<string, string>;
    layout: string;
    author: string;
    company: string;
    subject: string;
    title: string;
    addSlide(): { addText(...args: unknown[]): void; addImage(...args: unknown[]): void; addShape(...args: unknown[]): void; background?: unknown };
    writeFile(options: { fileName: string }): Promise<void>;
  }
}

declare module 'archiver' {
  type ArchiverInstance = { pipe(target: unknown): void; append(source: unknown, data: Record<string, unknown>): void; file(path: string, data?: Record<string, unknown>): void; finalize(): Promise<void>; on(event: string, listener: (...args: unknown[]) => void): ArchiverInstance };
  export default function archiver(format: string, options?: Record<string, unknown>): ArchiverInstance;
}

declare module 'node:stream' {
  export interface ReadableStreamLike extends AsyncIterable<Buffer | Uint8Array | string> { on(event: string, listener: (...args: unknown[]) => void): ReadableStreamLike }
  export interface WritableStreamLike { on(event: string, listener: (...args: unknown[]) => void): WritableStreamLike }
  export class PassThrough implements ReadableStreamLike { on(event: string, listener: (...args: unknown[]) => void): PassThrough; [Symbol.asyncIterator](): AsyncIterator<Buffer | Uint8Array | string>; }
}

declare module 'node:stream/promises' {
  export function pipeline(...streams: unknown[]): Promise<void>;
}

declare module '@aws-sdk/client-s3' {
  export class S3Client { constructor(options?: Record<string, unknown>); send<T = unknown>(command: unknown): Promise<T> }
  export class PutObjectCommand { constructor(input: Record<string, unknown>) }
  export class GetObjectCommand { constructor(input: Record<string, unknown>) }
  export class HeadObjectCommand { constructor(input: Record<string, unknown>) }
  export class DeleteObjectCommand { constructor(input: Record<string, unknown>) }
}

declare module 'bullmq' {
  export interface JobsOptions {
    jobId?: string;
    attempts?: number;
    backoff?: unknown;
    removeOnComplete?: boolean | number;
    removeOnFail?: boolean | number;
    delay?: number;
    priority?: number;
    repeat?: Record<string, unknown>;
    deduplication?: { id: string };
  }
  export interface Job<DataType = unknown> {
    id?: string | number;
    name: string;
    data: DataType;
    opts: { attempts?: number } & Record<string, unknown>;
    attemptsMade: number;
    processedOn?: number;
    finishedOn?: number;
    failedReason?: string;
    stacktrace?: string[];
  }
  export interface QueueCounts { waiting?: number; active?: number; completed?: number; failed?: number; delayed?: number; paused?: number }
  export interface WorkerOptions { connection?: unknown; concurrency?: number }
  export class Queue<DataType = unknown> {
    name: string;
    constructor(queueName: string, options?: { connection?: unknown });
    add(name: string, data: DataType, options?: JobsOptions): Promise<Job<DataType>>;
    getJobCounts(...statuses: string[]): Promise<QueueCounts>;
    getJobs(types: string[], start?: number, end?: number, asc?: boolean): Promise<Array<Job<DataType>>>;
    getJob(id: string): Promise<Job<DataType> | null>;
  }
  export class Worker<DataType = unknown> {
    constructor(queueName: string, processor: (job: Job<DataType>) => Promise<unknown>, options?: WorkerOptions);
    on(event: 'ready', listener: () => void): this;
    on(event: 'active', listener: (job: Job<DataType>) => void): this;
    on(event: 'completed', listener: (job: Job<DataType>) => void): this;
    on(event: 'failed', listener: (job: Job<DataType> | undefined, error: Error | undefined) => void | Promise<void>): this;
    on(event: 'error', listener: (error: Error | undefined) => void): this;
    on(event: string, listener: (...args: unknown[]) => void): this;
    close(): Promise<void>;
  }
}

declare module 'ioredis' {
  export default class IORedis {
    constructor(url: string, options?: Record<string, unknown>);
    ping(): Promise<string>;
    quit(): Promise<void>;
    ttl(key: string): Promise<number>;
    incr(key: string): Promise<number>;
    expire(key: string, seconds: number): Promise<number>;
    set(key: string, value: string, mode?: string, seconds?: number): Promise<'OK' | null>;
    del(...keys: string[]): Promise<number>;
  }
}

declare module 'express' {
  export interface Request { headers?: Record<string, string | string[] | undefined>; method?: string; path?: string; url?: string; originalUrl?: string; requestId?: string | null; correlationId?: string | null; body?: unknown; query?: Record<string, unknown>; params?: Record<string, unknown>; cookies?: Record<string, unknown>; ip?: string }
  export interface Response { setHeader(name: string, value: string): void; status(code: number): Response; json(body: unknown): unknown; end(body?: unknown): unknown; sendFile?(path: string): unknown; cookie?(name: string, value: unknown, options?: Record<string, unknown>): void; clearCookie?(name: string, options?: Record<string, unknown>): void }
  export interface NextFunction { (err?: unknown): void }
}

// Knowledge-kernel audit stubs for domain brain modules
declare module '../../../../packages/knowledge-kernel/src/culture-programs/agent-catalog' { export const CULTURE_PROGRAMS_AGENT_CATALOG: unknown[]; }
declare module '../../../../packages/knowledge-kernel/src/culture-programs/metadata-schema' { export const CULTURE_PROGRAMS_METADATA_SCHEMA: unknown[]; }
declare module '../../../../packages/knowledge-kernel/src/culture-programs/corpus-quality' { export function scoreCultureProgramsCorpusQuality(input: Record<string, number>): Record<string, unknown>; }
declare module '../../../../packages/knowledge-kernel/src/culture-programs/impact-partner-linkage' { export function summarizeImpactPartnerLinkage(input: Record<string, number>): Record<string, unknown>; }
declare module '../../../../packages/knowledge-kernel/src/culture-programs/vector-store-manager' { export function getCultureProgramsVectorStoreStatus(input: Record<string, number>): { syncState?: string; mode?: string } & Record<string, unknown>; }
declare module '../../../../packages/knowledge-kernel/src/culture-programs/retrieval-contracts' { export const CULTURE_PROGRAMS_RETRIEVAL_CONTRACTS: unknown[]; }
declare module '../../../../packages/knowledge-kernel/src/exhibition/agent-catalog' { export const EXHIBITION_AGENT_CATALOG: unknown[]; }
declare module '../../../../packages/knowledge-kernel/src/exhibition/metadata-schema' { export const EXHIBITION_METADATA_SCHEMA: unknown[]; }
declare module '../../../../packages/knowledge-kernel/src/exhibition/corpus-quality' { export function scoreExhibitionCorpusQuality(input: Record<string, number>): Record<string, unknown>; }
declare module '../../../../packages/knowledge-kernel/src/exhibition/studio-experience-linkage' { export function summarizeStudioExperienceLinkage(input: Record<string, number>): Record<string, unknown>; }
declare module '../../../../packages/knowledge-kernel/src/exhibition/vector-store-manager' { export function getExhibitionVectorStoreStatus(input: Record<string, number>): { syncState?: string; mode?: string } & Record<string, unknown>; }
declare module '../../../../packages/knowledge-kernel/src/exhibition/retrieval-contracts' { export const EXHIBITION_RETRIEVAL_CONTRACTS: unknown[]; }
declare module '../../../../packages/knowledge-kernel/src/mega-events/agent-catalog' { export const MEGA_EVENTS_AGENT_CATALOG: unknown[]; }
declare module '../../../../packages/knowledge-kernel/src/mega-events/metadata-schema' { export const MEGA_EVENTS_METADATA_SCHEMA: unknown[]; }
declare module '../../../../packages/knowledge-kernel/src/mega-events/corpus-quality' { export function scoreMegaEventsCorpusQuality(input: Record<string, number>): Record<string, unknown>; }
declare module '../../../../packages/knowledge-kernel/src/mega-events/readiness-operations-gap' { export function summarizeReadinessOperationsGap(input: Record<string, number>): Record<string, unknown>; }
declare module '../../../../packages/knowledge-kernel/src/mega-events/vector-store-manager' { export function getMegaEventsVectorStoreStatus(input: Record<string, number>): { syncState?: string; mode?: string } & Record<string, unknown>; }
declare module '../../../../packages/knowledge-kernel/src/mega-events/retrieval-contracts' { export const MEGA_EVENTS_RETRIEVAL_CONTRACTS: unknown[]; }


declare namespace NodeJS {
  interface ReadableStream { on(event: string, listener: (...args: unknown[]) => void): ReadableStream }
}
