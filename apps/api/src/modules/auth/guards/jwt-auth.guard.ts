import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../constants';
import { AuthService } from '../auth.service';
import { getRequestContext } from '../../../common/request-context';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly authService: AuthService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<any>();
    const authHeader = request.headers?.['authorization'] || request.headers?.['Authorization'];

    // 1) Authorization: Bearer <token>
    if (authHeader) {
      const [scheme, token] = String(authHeader).split(' ');
      if ((scheme || '').toLowerCase() !== 'bearer' || !token) {
        throw new UnauthorizedException('صيغة Authorization يجب أن تكون Bearer <token>');
      }
      request.user = this.authService.verifyToken(token);
      request.__authSource = 'header';
      try {
        const ctx = getRequestContext();
        ctx.userId = request.user?.sub;
        ctx.authSource = 'bearer';
        if (request.organizationIdHint) ctx.organizationId = String(request.organizationIdHint);
      } catch {}
      return true;
    }

    // 2) HttpOnly cookie: atheel_access (fallback to legacy atheel_token)
    const cookieToken = request.cookies?.['atheel_access'] || request.cookies?.['atheel_token'];
    if (!cookieToken) {
      throw new UnauthorizedException('Authorization أو Cookie مطلوب');
    }
    request.user = this.authService.verifyToken(String(cookieToken));
    request.__authSource = 'cookie';
    try {
      const ctx = getRequestContext();
      ctx.userId = request.user?.sub;
      ctx.authSource = 'cookie';
      if (request.organizationIdHint) ctx.organizationId = String(request.organizationIdHint);
    } catch {}
    return true;
  }
}
