import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_API_URL?.replace(/\/$/, '') || 'https://seller-api.atlasbasket.com';

export async function POST(req: NextRequest) {
  try {
    const sessionCookie = req.cookies.get('seller_session')?.value;

    try {
      await fetch(`${BACKEND_URL}/seller/api/auth/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(sessionCookie ? { Cookie: `seller_session=${sessionCookie}` } : {}),
        },
      });
    } catch {
      // Ignore backend logout errors
    }

    const response = NextResponse.json({ message: 'Logged out successfully' }, { status: 200 });
    response.cookies.delete('seller_session');
    response.cookies.delete('seller_refresh');

    return response;
  } catch (err: any) {
    console.error('[/api/seller/logout] Error:', err?.message || err);
    return NextResponse.json({ message: 'Logged out' }, { status: 200 });
  }
}
