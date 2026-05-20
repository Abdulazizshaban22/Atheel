import { Body, Controller, Get, Post, Res, Req, Param } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { Public } from './decorators/public.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import type { RequestUser } from './interfaces/request-user.interface';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { LogoutDto } from './dto/logout.dto';

function isProd() {
  return (process.env.NODE_ENV || '').toLowerCase() === 'production';
}

function cookieBaseOptions() {
  const secureEnv = (process.env.COOKIE_SECURE || '').toString().toLowerCase();
  const secure = secureEnv ? secureEnv === 'true' || secureEnv === '1' : isProd();
  const domain = (process.env.COOKIE_DOMAIN || '').toString().trim() || undefined;
  return {
    path: '/',
    sameSite: 'lax' as const,
    secure,
    domain,
  };
}

function daysToMs(days: number) {
  return Math.max(1, Math.floor(days)) * 24 * 60 * 60 * 1000;
}

type CryptoModuleLike = { randomBytes(size: number): Buffer };

function runtimeRequire<T>(moduleName: string): T {
  return require(moduleName) as T;
}

function randomCsrfToken() {
  const crypto = runtimeRequire<CryptoModuleLike>('node:crypto');
  return crypto.randomBytes(24).toString('hex');
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Get('csrf')
  csrf(@Res({ passthrough: true }) res: any) {
    const token = randomCsrfToken();
    res.cookie('atheel_csrf', token, { ...cookieBaseOptions(), httpOnly: false, maxAge: daysToMs(2) });
    return { ok: true, csrfToken: token };
  }

  @Public()
  @Throttle({ auth: { limit: 10, ttl: 60_000 } })
  @Post('login')
  async login(@Body() dto: LoginDto, @Req() req: any, @Res({ passthrough: true }) res: any) {
    const out = await this.authService.login(dto.email, dto.password, {
      ip: String(req?.ip || req?.headers?.['x-forwarded-for'] || ''),
      userAgent: String(req?.headers?.['user-agent'] || ''),
      correlationId: String(req?.correlationId || req?.headers?.['x-correlation-id'] || ''),
      requestId: String(req?.requestId || req?.headers?.['x-request-id'] || ''),
    });

    // Wave36: HttpOnly cookie sessions
    res.cookie('atheel_access', out.accessToken, {
      ...cookieBaseOptions(),
      httpOnly: true,
      maxAge: daysToMs(1),
    });

    if (out.refreshToken) {
      res.cookie('atheel_refresh', out.refreshToken, {
        ...cookieBaseOptions(),
        httpOnly: true,
        maxAge: daysToMs(Math.max(1, Number(out.refreshExpiresInDays || 14))),
      });
    }

    // Issue CSRF token for browser clients
    const csrf = randomCsrfToken();
    res.cookie('atheel_csrf', csrf, { ...cookieBaseOptions(), httpOnly: false, maxAge: daysToMs(2) });

    return { ...out, csrfToken: csrf };
  }

  @Public()
  @Post('refresh')
  async refresh(@Body() dto: RefreshTokenDto, @Req() req: any, @Res({ passthrough: true }) res: any) {
    const tokenFromBody = dto?.refreshToken;
    const tokenFromCookie = req?.cookies?.['atheel_refresh'];
    const refreshToken = String(tokenFromBody || tokenFromCookie || '');
    const out = await this.authService.refresh(refreshToken, {
      ip: String(req?.ip || req?.headers?.['x-forwarded-for'] || ''),
      userAgent: String(req?.headers?.['user-agent'] || ''),
    });

    res.cookie('atheel_access', out.accessToken, {
      ...cookieBaseOptions(),
      httpOnly: true,
      maxAge: daysToMs(1),
    });
    if (out.refreshToken) {
      res.cookie('atheel_refresh', out.refreshToken, {
        ...cookieBaseOptions(),
        httpOnly: true,
        maxAge: daysToMs(Math.max(1, Number(out.refreshExpiresInDays || 14))),
      });
    }
    // Rotate CSRF token after refresh
    const csrf = randomCsrfToken();
    res.cookie('atheel_csrf', csrf, { ...cookieBaseOptions(), httpOnly: false, maxAge: daysToMs(2) });
    return { ...out, csrfToken: csrf };
  }

  @ApiBearerAuth()
  @Post('logout')
  async logout(@CurrentUser() user: RequestUser, @Body() dto: LogoutDto, @Req() req: any, @Res({ passthrough: true }) res: any) {
    const tokenFromBody = dto?.refreshToken;
    const tokenFromCookie = req?.cookies?.['atheel_refresh'];
    const refreshToken = String(tokenFromBody || tokenFromCookie || '');
    const out = await this.authService.logout(user.sub, refreshToken || undefined);

    // Clear cookies
    const base = cookieBaseOptions();
    res.clearCookie('atheel_access', { ...base });
    res.clearCookie('atheel_refresh', { ...base });
    res.clearCookie('atheel_csrf', { ...base });
    return out;
  }

  @ApiBearerAuth()
  @Get('me')
  me(@CurrentUser() user?: RequestUser) {
    return { user };
  }

  // Wave55: multi-device refresh sessions
  @ApiBearerAuth()
  @Get('sessions')
  sessions(@CurrentUser() user: RequestUser) {
    return this.authService.listSessions(user.sub);
  }

  @ApiBearerAuth()
  @Post('sessions/:id/revoke')
  revokeSession(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.authService.revokeSession(user.sub, id);
  }

  @ApiBearerAuth()
  @Post('sessions/revoke-all')
  revokeAll(@CurrentUser() user: RequestUser) {
    return this.authService.revokeAllSessions(user.sub);
  }
}
