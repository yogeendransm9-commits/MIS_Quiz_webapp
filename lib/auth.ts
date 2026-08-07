import { cookies } from 'next/headers';
import { defaultAdminPassword } from './types';

const COOKIE = 'quiz_admin_authed';
const MAX_AGE = 60 * 60 * 12; // 12 hours

export function isAuthed(): boolean {
  const store = cookies();
  const c = store.get(COOKIE);
  return c?.value === '1';
}

export function setAuthed(res?: { setHeader: (k: string, v: string) => void }) {
  if (res) {
    res.setHeader(
      'Set-Cookie',
      `${COOKIE}=1; Path=/; HttpOnly; SameSite=Lax; Max-Age=${MAX_AGE}`,
    );
  }
}

export function clearAuthed() {
  const store = cookies();
  store.set({
    name: COOKIE,
    value: '',
    path: '/',
    maxAge: 0,
    httpOnly: true,
    sameSite: 'lax',
  });
}

export function verifyPassword(pw: string): boolean {
  const expected = defaultAdminPassword();
  if (!expected) return false;
  if (pw.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < pw.length; i++) diff |= pw.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}
