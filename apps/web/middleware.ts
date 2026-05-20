import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const PUBLIC_PATHS = ['/', '/login', '/forbidden'];

const ADMIN_ONLY_PREFIXES = [
  '/ops',
  '/dashboards/ops',
  '/approvals',
  '/governance',
  '/users',
];

type JwtPayloadLike = {
  roles?: unknown;
};

function isAdminPath(pathname: string) {
  return ADMIN_ONLY_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

function extractRoles(payload: JwtPayloadLike | null) {
  return Array.isArray(payload?.roles) ? payload.roles.map((value) => String(value)) : [];
}

async function decodeAndVerifyJwt(token: string): Promise<JwtPayloadLike | null> {
  const secret = (process.env.AUTH_JWT_SECRET || '').toString().trim();
  if (!secret) {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    try {
      const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8')) as JwtPayloadLike;
      return payload;
    } catch {
      return null;
    }
  }

  try {
    const key = new TextEncoder().encode(secret);
    const { payload } = await jwtVerify(token, key);
    return payload as JwtPayloadLike;
  } catch {
    return null;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/robots') ||
    pathname.match(/\.(?:png|jpg|jpeg|svg|webp|ico|css|js)$/)
  ) {
    return NextResponse.next();
  }

  const isPublic = PUBLIC_PATHS.includes(pathname) || pathname === '/public' || pathname.startsWith('/public/');
  const token = req.cookies.get('atheel_access')?.value || req.cookies.get('atheel_token')?.value;

  if (!isPublic && !token) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }

  if (pathname === '/login' && token) {
    const url = req.nextUrl.clone();
    url.pathname = '/workbench';
    return NextResponse.redirect(url);
  }

  if (token && isAdminPath(pathname)) {
    const payload = await decodeAndVerifyJwt(token);
    const roles = extractRoles(payload);
    const allowed = roles.includes('super_admin') || roles.includes('org_admin');

    if (!allowed) {
      const url = req.nextUrl.clone();
      url.pathname = '/forbidden';
      url.searchParams.set('next', pathname);
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api).*)'],
};
