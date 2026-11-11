import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_API_URL?.replace(/\/$/, '') || 'https://seller-api.atlasbasket.com';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const refreshTokenFromCookie = req.cookies.get('seller_refresh')?.value;
    const refreshToken = body.refreshToken || refreshTokenFromCookie;

    const backendRes = await fetch(`${BACKEND_URL}/seller/api/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(refreshTokenFromCookie ? { Cookie: `seller_refresh=${refreshTokenFromCookie}` } : {}),
      },
      body: JSON.stringify({ refreshToken }),
      credentials: 'include',
    });

    const data = await backendRes.json();

    if (!backendRes.ok) {
      return NextResponse.json(
        { message: data?.message || 'Token refresh failed' },
        { status: backendRes.status }
      );
    }

    const response = NextResponse.json(data, { status: 200 });
    const isProduction = process.env.NODE_ENV === 'production';

    if (data.token) {
      response.cookies.set('seller_session', data.token, {
        httpOnly: true,
        secure: isProduction,
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 7,
      });
    }

    if (data.refreshToken) {
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
    console.error('[/api/seller/refresh] Error:', err?.message || err);
    return NextResponse.json(
      { message: 'Internal server error during refresh' },
      { status: 500 }
    );
  }
}
