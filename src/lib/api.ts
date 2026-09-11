const PROXY_BASE = '/api/proxy';

async function parseJsonSafe(res: Response) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

/**
 * Concurrent 401s share one refresh call instead of each firing their own —
 * a dashboard page issues several requests at once, and without this they
 * would stampede the refresh endpoint.
 */
let refreshInFlight: Promise<boolean> | null = null;

async function refreshSession(): Promise<boolean> {
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async () => {
    try {
      const res = await fetch('/api/auth/refresh', { method: 'POST', credentials: 'same-origin' });
      return res.ok;
    } catch {
      return false;
    } finally {
      // Cleared on the next tick so callers awaiting this one still get it.
      setTimeout(() => {
        refreshInFlight = null;
      }, 0);
    }
  })();

  return refreshInFlight;
}

/**
 * Every dashboard data call — the session lives in an HttpOnly cookie the
 * browser attaches on its own, so nothing here ever touches a token. Reads
 * from `/api/proxy${endpoint}` (same-origin, this Next.js server), which is
 * the only thing that ever holds the real Bearer token, server-side.
 */
export async function fetchApi<T = any>(
  endpoint: string,
  options: RequestInit = {},
): Promise<{ success: boolean; data: T; message?: string }> {
  async function send() {
    // A JSON content-type with no body is rejected by Fastify before it ever
    // reaches a controller, so only claim one when a body is actually sent.
    const headers: HeadersInit = {
      ...(options.body !== undefined && options.body !== null
        ? { 'Content-Type': 'application/json' }
        : {}),
      ...options.headers,
    };

    return fetch(`${PROXY_BASE}${endpoint}`, { ...options, headers, credentials: 'same-origin' });
  }

  try {
    let res = await send();

    // An expired token is renewed once, transparently, so a long admin session
    // never bounces back to the login screen mid-task.
    if (res.status === 401) {
      const renewed = await refreshSession();

      if (renewed) {
        res = await send();
      } else {
        await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' }).catch(() => {});
        if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      }
    }

    return (
      (await parseJsonSafe(res)) ?? {
        success: false,
        data: null as any,
        message: 'The server sent back an empty response.',
      }
    );
  } catch (error: any) {
    console.error(`API Error on ${endpoint}:`, error);
    return {
      success: false,
      data: null as any,
      message: error.message || 'Network request failed',
    };
  }
}

/**
 * Login is the one place a raw token would otherwise pass through client
 * code — `/api/auth/login` sets it as an HttpOnly cookie server-side and
 * hands back only the user object, so this never sees the token at all.
 */
export async function loginAdmin(email: string, password: string) {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
    credentials: 'same-origin',
  }).catch(() => null);

  if (!res) {
    return { success: false, data: null, message: 'Could not reach the server.' };
  }
  return (await parseJsonSafe(res)) ?? { success: false, data: null, message: 'Empty response.' };
}

export async function logoutAdmin() {
  await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' }).catch(() => {});
}

/** Called once at startup to ask the server who (if anyone) the HttpOnly cookie belongs to. */
export async function fetchCurrentAdmin() {
  const res = await fetch('/api/auth/me', { credentials: 'same-origin' }).catch(() => null);
  if (!res || !res.ok) return null;
  const json = await parseJsonSafe(res);
  return json?.data?.user ?? null;
}
