import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

const JWT_SECRET = process.env.JWT_SECRET || '';
const CUSTOMER_COOKIE = 'elika_customer';
const ADMIN_COOKIE = 'elika_admin';
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60;

if (!JWT_SECRET) {
  console.warn('WARNING: JWT_SECRET is not set. Set it in .env');
}

export type AuthPayload = {
  sub: string;
  username?: string;
  email?: string;
  name?: string;
  role?: string;
};

export const signAdminToken = (user: { id: number; username: string; role: string }) => {
  return jwt.sign({ sub: String(user.id), username: user.username, role: user.role }, JWT_SECRET, {
    expiresIn: '7d',
  });
};

export const signCustomerToken = (user: { id: number; email: string; full_name: string }) => {
  return jwt.sign(
    { sub: String(user.id), email: user.email, name: user.full_name, role: 'customer' },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
};
export const getAdminFromCookies = async (): Promise<AuthPayload | null> => {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_COOKIE)?.value;
  console.log('getAdminFromCookies: token', token);
  if (!token) return null;
  try {
    const payload = jwt.verify(token, JWT_SECRET) as AuthPayload;
    console.log('getAdminFromCookies: payload', payload);
    return payload;
  } catch (err) {
    console.log('getAdminFromCookies: jwt verify error', err);
    return null;
  }
};

export const getCustomerFromCookies = async (): Promise<AuthPayload | null> => {
  const cookieStore = await cookies();
  const token = cookieStore.get(CUSTOMER_COOKIE)?.value;
  if (!token) return null;
  try {
    return jwt.verify(token, JWT_SECRET) as AuthPayload;
  } catch {
    return null;
  }
};

export const setAdminCookie = (response: NextResponse, token: string) => {
  response.cookies.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: COOKIE_MAX_AGE,
    path: '/',
  });
};

export const clearAdminCookie = (response: NextResponse) => {
  response.cookies.set(ADMIN_COOKIE, '', { maxAge: 0, path: '/' });
};

export const setCustomerCookie = (response: NextResponse, token: string) => {
  response.cookies.set(CUSTOMER_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: COOKIE_MAX_AGE,
    path: '/',
  });
};

export const clearCustomerCookie = (response: NextResponse) => {
  response.cookies.set(CUSTOMER_COOKIE, '', { maxAge: 0, path: '/' });
};
