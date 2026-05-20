import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../constants';

/**
 * Wave36: CSRF protection (Double Submit Cookie)
 *
 * Enforced only when authentication source is COOKIE.
 * API clients using Authorization: Bearer are not subject to CSRF.
 */
@Injectable()
export class CsrfGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const req = context.switchToHttp().getRequest<any>();
    const method = String(req?.method || 'GET').toUpperCase();
    if (['GET', 'HEAD', 'OPTIONS'].includes(method)) return true;

    // Enforce only for cookie-auth browser flows
    if (req?.__authSource !== 'cookie') return true;

    const cookie = String(req?.cookies?.['atheel_csrf'] || '');
    const header = String(req?.headers?.['x-csrf-token'] || req?.headers?.['X-CSRF-Token'] || '');
    if (!cookie || !header || cookie !== header) {
      throw new ForbiddenException('CSRF token غير صالح');
    }
    return true;
  }
}
