import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
const TOKEN_COOKIE = 'exambondhubd_admin_token';
const TOKEN_MAX_AGE_S = 60 * 60 * 24 * 7;

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

/**
 * fetchApi calls this once when the proxy answers 401, so a long admin
 * session never bounces to the login screen just because the token aged.
 * Same as login, the fresh token stops here — never returned to the client.
 */
export async function POST() {
  const token = cookies().get(TOKEN_COOKIE)?.value;
  if (!token) {
    return NextResponse.json({ success: false, message: 'No session.' }, { status: 401 });
  }

  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: '{}',
    });
  } catch {
    return NextResponse.json({ success: false, message: 'Could not reach the server.' }, { status: 502 });
  }

  const json = await res.json().catch(() => null);

  if (!res.ok || !json?.data?.accessToken) {
    cookies().delete(TOKEN_COOKIE);
    return NextResponse.json({ success: false, message: 'Session expired.' }, { status: 401 });
  }

  cookies().set(TOKEN_COOKIE, json.data.accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: TOKEN_MAX_AGE_S,
  });

  return NextResponse.json({ success: true, data: { user: json.data.user } });
}
