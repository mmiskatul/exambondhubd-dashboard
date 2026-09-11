import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
const TOKEN_COOKIE = 'exambondhubd_admin_token';

// GET route handlers are cacheable by Next.js's Route Cache by default —
// this one must never be, since the same URL has to answer with a different
// admin's identity depending on whose cookie called it.
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

/**
 * Called once at boot. The client can no longer read the session cookie
 * (it's HttpOnly), so this is how it learns whether one exists and who it
 * belongs to — StoreProvider dispatches whatever this returns.
 */
export async function GET() {
  const token = cookies().get(TOKEN_COOKIE)?.value;
  if (!token) {
    return NextResponse.json({ success: false, message: 'No session.' }, { status: 401 });
  }

  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}/auth/me`, {
      cache: 'no-store',
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch {
    return NextResponse.json({ success: false, message: 'Could not reach the server.' }, { status: 502 });
  }

  const json = await res.json().catch(() => null);

  if (!res.ok || !json?.success) {
    // A rejected/expired token is worth dropping here — otherwise every
    // future request keeps trying it and failing the same way.
    cookies().delete(TOKEN_COOKIE);
    return NextResponse.json({ success: false, message: 'Session expired.' }, { status: 401 });
  }

  return NextResponse.json({ success: true, data: { user: json.data } });
}
