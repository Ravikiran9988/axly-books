import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { destroySession, SESSION_COOKIE_NAME } from '@/lib/auth';

export async function POST(request?: Request) {
  try {
    let sessionToken: string | undefined;

    try {
      const cookieStore = await cookies();
      const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);
      sessionToken = sessionCookie?.value;
    } catch {
      // In standalone integration tests outside Next.js request context
    }

    if (!sessionToken && request) {
      const cookieHeader = request.headers.get('cookie') || '';
      const match = cookieHeader.match(new RegExp(`${SESSION_COOKIE_NAME}=([^;]+)`));
      if (match && match[1]) {
        sessionToken = match[1].trim();
      }
    }

    if (sessionToken) {
      await destroySession(sessionToken);
    }

    const response = NextResponse.json({ success: true, message: 'Logged out successfully.' });

    // Expire the session cookie immediately
    response.cookies.set(SESSION_COOKIE_NAME, '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
    });

    try {
      const cookieStore = await cookies();
      cookieStore.set(SESSION_COOKIE_NAME, '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 0,
      });
    } catch {
      // In standalone test context, response.cookies handles clearing
    }

    return response;
  } catch (err: unknown) {
    console.error('Logout error:', err);
    return NextResponse.json(
      { error: 'An unexpected error occurred during logout.' },
      { status: 500 }
    );
  }
}
