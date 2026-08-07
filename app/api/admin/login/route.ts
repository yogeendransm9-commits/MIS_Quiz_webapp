import { NextRequest, NextResponse } from 'next/server';
import { verifyPassword, setAuthed } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const { password } = await req.json();
  if (typeof password !== 'string') {
    return NextResponse.json({ ok: false, error: 'Missing password' }, { status: 400 });
  }
  if (!verifyPassword(password)) {
    return NextResponse.json({ ok: false, error: 'Incorrect password' }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set('quiz_admin_authed', '1', {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 12,
  });
  return res;
}
