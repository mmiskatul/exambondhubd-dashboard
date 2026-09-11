import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
const TOKEN_COOKIE = 'exambondhubd_admin_token';
// Mirrors the backend's JWT_EXPIRES_IN (7d) — see backend/.env.
const TOKEN_MAX_AGE_S = 60 * 60 * 24 * 7;

// Explicit rather than relying on POST handlers being outside the Route
// Cache by default — this must never dedupe/reuse a response across two
// different login attempts.
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

/**
 * Login is the one place the raw token exists at all — everywhere else reads
 * it back out of the HttpOnly cookie set here. It never reaches client JS:
 * only `{ user }` continues past this handler.
 */
export async function POST(request: NextRequest) {
  const body = await request.text();

  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}/auth/admin-login`, {
      method: 'POST',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json' },
      body,
    });
  } catch {
    return NextResponse.json(
      { success: false, message: 'Could not reach the server. Please try again.' },
      { status: 502 },
    );
  }

  const json = await res.json().catch(() => null);

  if (!res.ok || !json?.success || !json?.data?.accessToken) {
    return NextResponse.json(
      json ?? { success: false, message: 'Sign-in failed.' },
      { status: res.ok ? 401 : res.status },
    );
  }

  cookies().set(TOKEN_COOKIE, json.data.accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: TOKEN_MAX_AGE_S,
  });

  return NextResponse.json({
    success: true,
    message: json.message,
    data: { user: json.data.user },
  });
}
