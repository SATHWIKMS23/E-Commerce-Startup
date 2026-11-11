import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_API_URL?.replace(/\/$/, '') || 'https://seller-api.atlasbasket.com';

function splitSetCookieHeader(raw: string): string[] {
  return raw.split(/,\s*(?=[a-zA-Z0-9_\-]+=)/);
}

function parseCookieEntry(entry: string): { value: string; maxAge?: number } | null {
  const parts = entry.split(';').map((p) => p.trim());
  const nameValue = parts[0];
  if (!nameValue) return null;

  const eqIndex = nameValue.indexOf('=');
  if (eqIndex === -1) return null;

  const value = nameValue.slice(eqIndex + 1);
  let maxAge: number | undefined;

  for (const directive of parts.slice(1)) {
    const lower = directive.toLowerCase();
    if (lower.startsWith('max-age=')) {
      const parsed = parseInt(lower.slice('max-age='.length), 10);
      if (!isNaN(parsed)) maxAge = parsed;
    }
  }

  return { value, maxAge };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { identifier, password } = body;

    if (!identifier || !password) {
      return NextResponse.json(
        { message: 'Identifier and password are required' },
        { status: 400 }
      );
    }

    const backendRes = await fetch(`${BACKEND_URL}/seller/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier, password }),
      credentials: 'include',
    });

    const data = await backendRes.json();

    if (!backendRes.ok) {
      return NextResponse.json(
        { message: data?.message || 'Login failed' },
        { status: backendRes.status }
      );
    }

    const response = NextResponse.json(data, { status: 200 });
    const rawSetCookie = backendRes.headers.get('set-cookie');
    const isProduction = process.env.NODE_ENV === 'production';

    if (rawSetCookie) {
      const cookieEntries = splitSetCookieHeader(rawSetCookie);
      for (const entry of cookieEntries) {
        if (entry.trimStart().startsWith('seller_session=')) {
          const parsed = parseCookieEntry(entry);
          if (parsed) {
            response.cookies.set('seller_session', parsed.value, {
              httpOnly: true,
              secure: isProduction,
              sameSite: 'lax',
              path: '/',
              maxAge: parsed.maxAge ?? 60 * 60 * 24 * 7,
            });
          }
        } else if (entry.trimStart().startsWith('seller_refresh=')) {
          const parsed = parseCookieEntry(entry);
          if (parsed) {
            response.cookies.set('seller_refresh', parsed.value, {
              httpOnly: true,
              secure: isProduction,
              sameSite: 'lax',
              path: '/',
              maxAge: parsed.maxAge ?? 60 * 60 * 24 * 30,
            });
          }
        }
      }
    }

    if (data.token && !response.cookies.has('seller_session')) {
      response.cookies.set('seller_session', data.token, {
        httpOnly: true,
        secure: isProduction,
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 7,
      });
    }

    if (data.refreshToken && !response.cookies.has('seller_refresh')) {
      response.cookies.set('seller_refresh', data.refreshToken, {
        httpOnly: true,
        secure: isProduction,
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 30,
      });
    }

    return response;
  } catch (err: any) {
    console.error('[/api/seller/login] Error:', err?.message || err);
    return NextResponse.json(
      { message: 'Internal server error during login' },
      { status: 500 }
    );
  }
}
