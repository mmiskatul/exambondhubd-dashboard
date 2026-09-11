import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
const TOKEN_COOKIE = 'exambondhubd_admin_token';

// Every one of these backend routes answers with a raw accessToken in the
// body. login/refresh already have dedicated handlers (api/auth/login,
// api/auth/refresh) that intercept that token and keep it server-side —
// routing any of them through this generic pass-through instead would ship
// the token straight to client JS and undo the whole HttpOnly-cookie fix.
// Blocked here so that mistake fails loudly instead of silently reopening
// the hole the day someone calls fetchApi('/auth/refresh') without knowing
// why that is wrong.
const TOKEN_ISSUING_PATHS = new Set([
  'auth/login',
  'auth/admin-login',
  'auth/google',
  'auth/refresh',
  'auth/verify-email',
  'auth/reset-password',
]);

// Reading cookies() already makes Next.js treat this route as dynamic, which
// also happens to disable the fetch() Data Cache below it — confirmed live
// (a count fetched through this route updated immediately after a DB change
// with the same session, same URL). This makes that explicit instead of
// resting on an inferred side effect: every response here is per-request,
// per-session data, and must never be cached, deduped, or reused across
// two different admins hitting the same URL.
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

/**
 * Every dashboard API call goes through here instead of straight from the
 * browser to the backend. The session token lives only in an HttpOnly
 * cookie this route reads server-side and attaches as a Bearer header — the
 * browser never holds a copy, so an XSS bug in the dashboard can no longer
 * walk off with a valid admin session.
 */
async function forward(request: NextRequest, { params }: { params: { path: string[] } }) {
  const path = params.path.join('/');

  if (TOKEN_ISSUING_PATHS.has(path)) {
    return NextResponse.json(
      {
        success: false,
        data: null,
        message: `${path} must be called through its dedicated /api/auth route, not the generic proxy.`,
      },
      { status: 400 },
    );
  }

  const token = cookies().get(TOKEN_COOKIE)?.value;
  const url = `${API_BASE_URL}/${path}${request.nextUrl.search}`;

  const method = request.method;
  let body: string | undefined;
  if (method !== 'GET' && method !== 'HEAD') {
    const text = await request.text();
    body = text.length > 0 ? text : undefined;
  }

  let res: Response;
  try {
    res = await fetch(url, {
      method,
      cache: 'no-store',
      headers: {
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body,
    });
  } catch {
    return NextResponse.json(
      { success: false, data: null, message: 'Could not reach the server.' },
      { status: 502 },
    );
  }

  const text = await res.text();
  return new NextResponse(text, {
    status: res.status,
    headers: { 'Content-Type': res.headers.get('Content-Type') || 'application/json' },
  });
}

export { forward as GET, forward as POST, forward as PATCH, forward as PUT, forward as DELETE };
