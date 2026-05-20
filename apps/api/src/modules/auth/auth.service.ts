import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { randomBytes, scryptSync, timingSafeEqual, createHash, randomUUID } from 'node:crypto';
import IORedis from 'ioredis';
import { PrismaService } from '@madar/db';
import { OperationalEventsService } from '../operational-events/operational-events.service';
import { loadSecretEnv } from '../../common/secrets';
import { throwCorePersistenceError } from '../../common/db-fallback';
import type { PlatformRole } from './constants';
import type { RequestUser } from './interfaces/request-user.interface';

interface DemoIdentity {
  id: string;
  email: string;
  displayName: string;
  isActive: boolean;
  passwordHash?: string;
  refreshTokenHash?: string | null;
  roles: PlatformRole[];
  orgIds?: string[];
  orgRoles?: Record<string, PlatformRole[]>;
  lastLoginAt?: string;
}

@Injectable()
export class AuthService {
  private redis?: IORedis;
  // Redis is still used for rate/lockout counters; refresh sessions are persisted in Prisma (Wave55)
  private readonly loginFailKeyPrefix = 'atheel:auth:lf:';
  private readonly loginLockKeyPrefix = 'atheel:auth:lock:';

  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly events: OperationalEventsService,
  ) {
    // Redis is used for counters/lockout windows (scale-out)
    const redisUrl = this.config.get<string>('REDIS_URL') || process.env.REDIS_URL || process.env.REDIS_CONNECTION_STRING;
    if (redisUrl) {
      this.redis = new IORedis(redisUrl, { maxRetriesPerRequest: null });
    }

  }

  private authFailWindowSec() {
    return Math.max(60, Number(this.config.get('AUTH_FAIL_WINDOW_SEC') || process.env.AUTH_FAIL_WINDOW_SEC || 900));
  }

  private authLockoutSec() {
    return Math.max(60, Number(this.config.get('AUTH_LOCKOUT_SEC') || process.env.AUTH_LOCKOUT_SEC || 900));
  }

  private authMaxFailedAttempts() {
    return Math.max(3, Number(this.config.get('AUTH_MAX_FAILED_ATTEMPTS') || process.env.AUTH_MAX_FAILED_ATTEMPTS || 5));
  }

  private normalizeEmailKey(email: string) {
    return String(email || '').trim().toLowerCase();
  }

  private failKey(emailKey: string) {
    return `${this.loginFailKeyPrefix}${emailKey}`;
  }

  private lockKey(emailKey: string) {
    return `${this.loginLockKeyPrefix}${emailKey}`;
  }

  private async checkLoginLock(emailKey: string) {
    if (!this.redis) return { locked: false };
    const key = this.lockKey(emailKey);
    const ttl = await this.redis.ttl(key).catch(() => -2);
    if (ttl && ttl > 0) return { locked: true, retryAfterSec: ttl };
    return { locked: false };
  }

  private async recordLoginFailure(params: { emailKey: string; ip?: string; userAgent?: string; correlationId?: string; requestId?: string; userId?: string | null; }) {
    const max = this.authMaxFailedAttempts();
    const windowSec = this.authFailWindowSec();
    const lockSec = this.authLockoutSec();

    let count = 0;
    let locked = false;
    let retryAfterSec: number | undefined;

    if (this.redis) {
      const fk = this.failKey(params.emailKey);
      count = await this.redis.incr(fk).catch(() => 1);
      // keep a rolling window
      if (count === 1) {
        await this.redis.expire(fk, windowSec).catch(() => undefined);
      }

      if (count >= max) {
        const lk = this.lockKey(params.emailKey);
        await this.redis.set(lk, '1', 'EX', lockSec).catch(() => undefined);
        locked = true;
      }
      if (locked) {
        retryAfterSec = lockSec;
      }
    } else {
      // dev fallback (memory-only) without strict lockout
      count = 1;
    }

    const eventType = locked ? 'auth.login.locked' : 'auth.login.failed';
    await this.events.emit({
      actorType: 'system',
      actorUserId: params.userId || null,
      eventType,
      severity: locked ? 'warning' : 'warning',
      subject: `Auth/Login/${params.emailKey}`,
      correlationId: params.correlationId || null,
      requestId: params.requestId || null,
      data: {
        email: params.emailKey,
        ip: params.ip || null,
        userAgent: params.userAgent || null,
        failedAttempts: count,
        maxFailedAttempts: max,
        lockoutSeconds: locked ? lockSec : 0,
        failWindowSeconds: windowSec,
      },
    }).catch(() => null);

    return { count, locked, retryAfterSec };
  }

  private async clearLoginFailures(emailKey: string) {
    if (!this.redis) return;
    await this.redis.del(this.failKey(emailKey), this.lockKey(emailKey)).catch(() => undefined);
  }

  async login(email: string, password: string, ctx?: { ip?: string; userAgent?: string; correlationId?: string; requestId?: string }) {
    const emailKey = this.normalizeEmailKey(email);
    const lock = await this.checkLoginLock(emailKey);
    if (lock.locked) {
      await this.events.emit({ actorType: 'system', eventType: 'auth.login.blocked', severity: 'warning', subject: `Auth/Login/${emailKey}`, correlationId: ctx?.correlationId || null, requestId: ctx?.requestId || null, data: { email: emailKey, ip: ctx?.ip || null, retryAfterSec: lock.retryAfterSec } }).catch(() => null);
      throw new UnauthorizedException('تم إيقاف المحاولة مؤقتًا. حاول لاحقًا');
    }
    const user = await this.findUserByEmail(email);
    if (!user || !user.isActive) throw new UnauthorizedException('المستخدم غير صالح');

    const isValid = user.passwordHash ? this.verifyPassword(password, user.passwordHash) : false;
    if (!isValid) {
      const r = await this.recordLoginFailure({ emailKey, ip: ctx?.ip, userAgent: ctx?.userAgent, correlationId: ctx?.correlationId, requestId: ctx?.requestId, userId: user.id });
      if (r.locked) {
        throw new UnauthorizedException('تم قفل الحساب مؤقتًا بسبب محاولات فاشلة متكررة');
      }
      throw new UnauthorizedException('بيانات الدخول غير صحيحة');
    }

    await this.clearLoginFailures(emailKey);
    const payload: RequestUser = {
      sub: user.id,
      email: user.email,
      name: user.displayName,
      roles: user.roles,
      orgIds: user.orgIds,
      orgRoles: user.orgRoles,
    };

    const accessToken = this.jwt.sign(payload, {
      secret: this.getJwtSecret(),
      expiresIn: this.config.get<string>('AUTH_JWT_EXPIRES_IN') || '12h',
    });

    // Wave55: multi-device refresh sessions persisted in Prisma + rotation + reuse detection
    const refresh = await this.createRefreshSession(user.id, {
      ip: ctx?.ip,
      userAgent: ctx?.userAgent,
      deviceName: this.guessDeviceName(ctx?.userAgent),
    });

    // Clear legacy single-token hash field (Wave55 uses RefreshSession tables)
    await this.persistUserAuthState(user.id, { refreshTokenHash: null, lastLoginAt: new Date() });

    return {
      accessToken,
      refreshToken: refresh.refreshToken,
      tokenType: 'Bearer',
      expiresIn: this.config.get<string>('AUTH_JWT_EXPIRES_IN') || '12h',
      refreshExpiresInDays: this.getRefreshDays(),
      user: payload,
      session: refresh.session,
      note: 'Wave55: جلسات Refresh متعددة الأجهزة + Refresh Rotation + كشف إعادة استخدام التوكن (Reuse Detection).',
    };
  }

  async refresh(refreshToken: string, ctx?: { ip?: string; userAgent?: string }) {
    const rotated = await this.rotateRefreshToken(refreshToken, ctx);
    const user = await this.findUserById(rotated.userId);
    if (!user || !user.isActive) throw new UnauthorizedException('المستخدم غير صالح');

    const payload: RequestUser = {
      sub: user.id,
      email: user.email,
      name: user.displayName,
      roles: user.roles,
      orgIds: user.orgIds,
      orgRoles: user.orgRoles,
    };

    const accessToken = this.jwt.sign(payload, {
      secret: this.getJwtSecret(),
      expiresIn: this.config.get<string>('AUTH_JWT_EXPIRES_IN') || '12h',
    });

    return {
      accessToken,
      refreshToken: rotated.refreshToken,
      tokenType: 'Bearer',
      expiresIn: this.config.get<string>('AUTH_JWT_EXPIRES_IN') || '12h',
      refreshExpiresInDays: this.getRefreshDays(),
      user: payload,
      session: rotated.session,
    };
  }

  async logout(userId: string, refreshToken?: string) {
    if (refreshToken) {
      await this.revokeRefreshSession(refreshToken, userId).catch(() => null);
    }
    // Do not clear other device sessions. (Multi-device)
    return { ok: true };
  }

  // Wave55: multi-device sessions management
  async listSessions(userId: string) {
    try {
      const rows = await (this.prisma as Record<string, unknown>).refreshSession?.findMany?.({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });
      return (rows || []).map((s: any) => ({
        id: s.id,
        familyId: s.familyId,
        state: s.state,
        createdAt: s.createdAt ? new Date(s.createdAt).toISOString() : null,
        lastSeenAt: s.lastSeenAt ? new Date(s.lastSeenAt).toISOString() : null,
        expiresAt: s.expiresAt ? new Date(s.expiresAt).toISOString() : null,
        deviceName: s.deviceName || null,
        ip: s.ip || null,
      }));
    } catch (err) {
      throwCorePersistenceError(err, 'AuthService.listSessions');
    }
  }

  async revokeSession(userId: string, sessionId: string) {
    const now = new Date();
    try {
      const s = await (this.prisma as Record<string, unknown>).refreshSession?.findUnique?.({ where: { id: sessionId } });
      if (!s || String(s.userId) !== String(userId)) return { ok: true };
      await (this.prisma as Record<string, unknown>).refreshSession.update({ where: { id: sessionId }, data: { state: 'revoked', revokedAt: now } });
      await (this.prisma as Record<string, unknown>).refreshSessionToken?.updateMany?.({ where: { sessionId, revokedAt: null }, data: { revokedAt: now } });
      return { ok: true };
    } catch (err) {
      throwCorePersistenceError(err, 'AuthService.revokeSession');
    }
  }

  async revokeAllSessions(userId: string) {
    const now = new Date();
    try {
      await (this.prisma as Record<string, unknown>).refreshSession?.updateMany?.({ where: { userId, state: 'active' }, data: { state: 'revoked', revokedAt: now } });
      // tokens
      const sessions = await (this.prisma as Record<string, unknown>).refreshSession?.findMany?.({ where: { userId } });
      const ids = (sessions || []).map((s: any) => s.id);
      if (ids.length) {
        await (this.prisma as Record<string, unknown>).refreshSessionToken?.updateMany?.({ where: { sessionId: { in: ids }, revokedAt: null }, data: { revokedAt: now } });
      }
      return { ok: true };
    } catch (err) {
      throwCorePersistenceError(err, 'AuthService.revokeAllSessions');
    }
  }

  verifyToken(token: string): RequestUser {
    return this.jwt.verify<RequestUser>(token, { secret: this.getJwtSecret() });
  }

  // ----------------
  // Internal helpers
  // ----------------

  private isProd(): boolean {
    return (process.env.NODE_ENV || '').toLowerCase() === 'production';
  }


  private async findUserByEmail(email: string): Promise<DemoIdentity | null> {
    try {
      const prismaUser = (this.prisma as any)?.user;
      if (!prismaUser?.findUnique) throw new Error('prisma user unavailable');
      const u = await prismaUser.findUnique({
        where: { email },
        include: { memberships: true },
      });
      if (!u) return null;

      const orgRoles: Record<string, PlatformRole[]> = {};
      for (const m of (u.memberships || [])) {
        const orgId = String((m as Record<string, unknown>).organizationId || '');
        const role = String((m as Record<string, unknown>).role || '') as PlatformRole;
        if (!orgId || !role) continue;
        orgRoles[orgId] = orgRoles[orgId] || [];
        if (!orgRoles[orgId].includes(role)) orgRoles[orgId].push(role);
      }
      const roles = [...new Set(Object.values(orgRoles).flat())] as PlatformRole[];
      const orgIds = Object.keys(orgRoles);
      return {
        id: u.id,
        email: u.email,
        displayName: u.displayName,
        isActive: u.isActive,
        passwordHash: u.passwordHash || undefined,
        refreshTokenHash: u.refreshTokenHash,
        roles: roles.length ? roles : (['viewer'] as PlatformRole[]),
        orgIds,
        orgRoles,
        lastLoginAt: u.lastLoginAt ? new Date(u.lastLoginAt).toISOString() : undefined,
      };
    } catch (err) {
      throwCorePersistenceError(err, 'AuthService.findUserByEmail');
    }
  }

  private async findUserById(id: string): Promise<DemoIdentity | null> {
    try {
      const prismaUser = (this.prisma as any)?.user;
      if (!prismaUser?.findUnique) throw new Error('prisma user unavailable');
      const u = await prismaUser.findUnique({
        where: { id },
        include: { memberships: true },
      });
      if (!u) return null;

      const orgRoles: Record<string, PlatformRole[]> = {};
      for (const m of (u.memberships || [])) {
        const orgId = String((m as Record<string, unknown>).organizationId || '');
        const role = String((m as Record<string, unknown>).role || '') as PlatformRole;
        if (!orgId || !role) continue;
        orgRoles[orgId] = orgRoles[orgId] || [];
        if (!orgRoles[orgId].includes(role)) orgRoles[orgId].push(role);
      }
      const roles = [...new Set(Object.values(orgRoles).flat())] as PlatformRole[];
      const orgIds = Object.keys(orgRoles);
      return {
        id: u.id,
        email: u.email,
        displayName: u.displayName,
        isActive: u.isActive,
        passwordHash: u.passwordHash || undefined,
        refreshTokenHash: u.refreshTokenHash,
        roles: roles.length ? roles : (['viewer'] as PlatformRole[]),
        orgIds,
        orgRoles,
        lastLoginAt: u.lastLoginAt ? new Date(u.lastLoginAt).toISOString() : undefined,
      };
    } catch (err) {
      throwCorePersistenceError(err, 'AuthService.findUserById');
    }
  }


  private hashPassword(password: string): string {
    const salt = randomBytes(16).toString('hex');
    const digest = scryptSync(password, salt, 64).toString('hex');
    return `scrypt$${salt}$${digest}`;
  }

  private verifyPassword(password: string, encoded: string): boolean {
    try {
      const [algo, salt, digest] = encoded.split('$');
      if (algo !== 'scrypt' || !salt || !digest) return false;
      const compare = scryptSync(password, salt, 64);
      const stored = Buffer.from(digest, 'hex');
      if (stored.length !== compare.length) return false;
      return timingSafeEqual(stored, compare);
    } catch {
      return false;
    }
  }

  // ----------------
  // Refresh sessions (Wave55)
  // ----------------

  private getRefreshPepper(): string {
    loadSecretEnv('AUTH_REFRESH_PEPPER');
    const v = (this.config.get<string>('AUTH_REFRESH_PEPPER') || process.env.AUTH_REFRESH_PEPPER || '').toString();
    // fall back to JWT secret (still ok, but better to set explicit pepper)
    return v || this.getJwtSecret();
  }

  private hashRefreshValidator(validator: string) {
    return createHash('sha256').update(`${validator}|${this.getRefreshPepper()}`).digest('hex');
  }

  private buildRefreshToken(sessionId: string, validator: string) {
    return `rt1.${sessionId}.${validator}`;
  }

  private parseRefreshToken(token: string): { sessionId: string; validator: string } {
    const raw = String(token || '').trim();
    const parts = raw.split('.');
    if (parts.length !== 3 || parts[0] !== 'rt1') throw new UnauthorizedException('Refresh token غير صالح');
    const sessionId = String(parts[1] || '').trim();
    const validator = String(parts[2] || '').trim();
    if (!sessionId || !validator) throw new UnauthorizedException('Refresh token غير صالح');
    return { sessionId, validator };
  }

  private guessDeviceName(userAgent?: string) {
    const ua = String(userAgent || '').toLowerCase();
    if (!ua) return undefined;
    if (ua.includes('iphone')) return 'iPhone';
    if (ua.includes('ipad')) return 'iPad';
    if (ua.includes('android')) return 'Android';
    if (ua.includes('macintosh')) return 'Mac';
    if (ua.includes('windows')) return 'Windows';
    return 'Browser';
  }

  private async createRefreshSession(userId: string, ctx?: { ip?: string; userAgent?: string; deviceName?: string }) {
    const ttlDays = this.getRefreshDays();
    const expiresAt = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000);
    const familyId = `rf_${randomUUID().slice(0, 12)}`;

    const sessionId = `rs_${randomUUID().slice(0, 16)}`;
    const tokenId = `rst_${randomUUID().slice(0, 16)}`;
    const validator = randomBytes(32).toString('base64url');
    const tokenHash = this.hashRefreshValidator(validator);

    try {
      const tx = (this.prisma as Record<string, unknown>).$transaction;
      if (!tx) throw new Error('prisma_tx_unavailable');
      await (this.prisma as Record<string, unknown>).$transaction(async (p: any) => {
        await p.refreshSession.create({
          data: {
            id: sessionId,
            userId,
            familyId,
            state: 'active',
            expiresAt,
            ip: ctx?.ip || null,
            userAgent: ctx?.userAgent || null,
            deviceName: ctx?.deviceName || null,
            currentTokenId: tokenId,
          },
        });
        await p.refreshSessionToken.create({
          data: {
            id: tokenId,
            sessionId,
            tokenHash,
          },
        });
      });

      // Soft limit number of active sessions per user
      const maxSessions = Math.max(2, Number(this.config.get('AUTH_MAX_SESSIONS_PER_USER') || process.env.AUTH_MAX_SESSIONS_PER_USER || 10));
      await this.pruneOldSessions(userId, maxSessions).catch(() => null);

      return {
        refreshToken: this.buildRefreshToken(sessionId, validator),
        session: { id: sessionId, familyId, expiresAt: expiresAt.toISOString(), deviceName: ctx?.deviceName || null },
      };
    } catch (err) {
      throwCorePersistenceError(err, 'AuthService.createRefreshSession');
    }
  }

  private async pruneOldSessions(userId: string, maxSessions: number) {
    const rs = (this.prisma as any)?.refreshSession;
    if (!rs?.findMany || !rs?.updateMany) return;
    const sessions = await rs.findMany({
      where: { userId, state: 'active' },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    if (sessions.length <= maxSessions) return;
    const toRevoke = sessions.slice(maxSessions);
    const ids = toRevoke.map((s: any) => s.id);
    await rs.updateMany({ where: { id: { in: ids } }, data: { state: 'revoked', revokedAt: new Date() } });
  }

  private async rotateRefreshToken(refreshToken: string, ctx?: { ip?: string; userAgent?: string }) {
    const { sessionId, validator } = this.parseRefreshToken(refreshToken);
    const tokenHash = this.hashRefreshValidator(validator);
    const now = new Date();

    // Prisma path
    try {
      const out = await (this.prisma as Record<string, unknown>).$transaction(async (p: any) => {
        const session = await p.refreshSession.findUnique({
          where: { id: sessionId },
          include: { currentToken: true },
        });
        if (!session) throw new UnauthorizedException('Refresh token غير صالح');
        if (String(session.state) !== 'active') throw new UnauthorizedException('الجلسة غير فعّالة');
        if (session.expiresAt && new Date(session.expiresAt).getTime() < now.getTime()) {
          await p.refreshSession.update({ where: { id: sessionId }, data: { state: 'expired', revokedAt: now } }).catch(() => null);
          throw new UnauthorizedException('انتهت صلاحية الجلسة');
        }

        const tokenRow = await p.refreshSessionToken.findUnique({ where: { tokenHash } });
        if (!tokenRow || String(tokenRow.sessionId) !== String(sessionId)) {
          throw new UnauthorizedException('Refresh token غير صالح');
        }

        // Reuse detection: any token that is not the current one
        if (String(tokenRow.id) !== String(session.currentTokenId)) {
          await this.events.emit({
            actorType: 'system',
            actorUserId: String(session.userId),
            eventType: 'auth.refresh.reuse_detected',
            severity: 'critical',
            subject: `Auth/RefreshSession/${sessionId}`,
            data: {
              familyId: String(session.familyId),
              sessionId,
              ip: ctx?.ip || null,
              userAgent: ctx?.userAgent || null,
            },
          }).catch(() => null);
          // Mark family compromised and revoke
          await this.compromiseFamilyTx(p, String(session.familyId), now);
          throw new UnauthorizedException('تم اكتشاف إعادة استخدام Refresh Token. تم إبطال الجلسات');
        }

        // Rotation: mark old token used + create new token + update currentTokenId
        const newTokenId = `rst_${randomUUID().slice(0, 16)}`;
        const newValidator = randomBytes(32).toString('base64url');
        const newHash = this.hashRefreshValidator(newValidator);

        await p.refreshSessionToken.update({
          where: { id: tokenRow.id },
          data: { usedAt: now, replacedByTokenId: newTokenId },
        });
        await p.refreshSessionToken.create({
          data: { id: newTokenId, sessionId, tokenHash: newHash },
        });
        const updated = await p.refreshSession.update({
          where: { id: sessionId },
          data: { currentTokenId: newTokenId, lastSeenAt: now, ip: ctx?.ip || null, userAgent: ctx?.userAgent || null },
        });

        return {
          userId: String(updated.userId),
          refreshToken: this.buildRefreshToken(sessionId, newValidator),
          session: { id: sessionId, familyId: String(updated.familyId), expiresAt: new Date(updated.expiresAt).toISOString(), deviceName: updated.deviceName || null },
        };
      });
      return out;
    } catch (err) {
      // If the error is already an UnauthorizedException, keep it.
      if (err instanceof UnauthorizedException) throw err;
      throwCorePersistenceError(err, 'AuthService.rotateRefreshToken');
    }

    throw new UnauthorizedException('Refresh token غير صالح أو منتهي');
  }

  private async compromiseFamilyTx(p: any, familyId: string, now: Date) {
    await p.refreshSession.updateMany({ where: { familyId, state: 'active' }, data: { state: 'compromised', compromisedAt: now, revokedAt: now } });
    const sessions = await p.refreshSession.findMany({ where: { familyId } });
    const sessionIds = sessions.map((s: any) => s.id);
    await p.refreshSessionToken.updateMany({ where: { sessionId: { in: sessionIds }, revokedAt: null }, data: { revokedAt: now } });
  }

  private async revokeRefreshSession(refreshToken: string, userId: string) {
    const { sessionId } = this.parseRefreshToken(refreshToken);
    const now = new Date();
    try {
      const rs = (this.prisma as any)?.refreshSession;
      if (!rs?.findUnique || !rs?.update) throw new Error('refreshSession unavailable');
      const s = await rs.findUnique({ where: { id: sessionId } });
      if (!s) return;
      if (String(s.userId) !== String(userId)) return;
      await rs.update({ where: { id: sessionId }, data: { state: 'revoked', revokedAt: now } });
      const rt = (this.prisma as any)?.refreshSessionToken;
      await rt?.updateMany?.({ where: { sessionId, revokedAt: null }, data: { revokedAt: now } });
    } catch (err) {
      throwCorePersistenceError(err, 'AuthService.revokeRefreshSession');
    }
  }

  private getJwtSecret(): string {
    loadSecretEnv('AUTH_JWT_SECRET');
    loadSecretEnv('JWT_SECRET');
    const secret = this.config.get<string>('AUTH_JWT_SECRET') || this.config.get<string>('JWT_SECRET') || '';
    if (this.isProd() && (!secret || secret.startsWith('CHANGE_ME'))) {
      throw new Error('AUTH_JWT_SECRET must be set in production');
    }
    return secret || 'CHANGE_ME_ATHEEL_DEV_SECRET';
  }

  private getRefreshDays(): number {
    const v = Number(this.config.get<string>('AUTH_REFRESH_EXPIRES_IN_DAYS') || '14');
    return Number.isFinite(v) && v > 0 ? v : 14;
  }

  private async persistUserAuthState(userId: string, patch: { refreshTokenHash?: string | null; lastLoginAt?: Date | null }) {
    try {
      const prismaUser = (this.prisma as any)?.user;
      if (!prismaUser?.update) throw new Error('prisma user unavailable');
      await prismaUser.update({
        where: { id: userId },
        data: {
          ...(patch.refreshTokenHash !== undefined ? { refreshTokenHash: patch.refreshTokenHash } : {}),
          ...(patch.lastLoginAt ? { lastLoginAt: patch.lastLoginAt } : {}),
        },
      });
    } catch (err) {
      throwCorePersistenceError(err, 'AuthService.persistUserAuthState');
    }
  }
}
