import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const TOKEN_COOKIE = 'exambondhubd_admin_token';

export const dynamic = 'force-dynamic';

// A stateless JWT has nothing server-side to revoke — this only ever needed
// to clear the cookie, which is exactly what the old client-side clearSession
// did too.
export async function POST() {
  cookies().delete(TOKEN_COOKIE);
  return NextResponse.json({ success: true });
}
