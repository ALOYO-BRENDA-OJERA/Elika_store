import bcrypt from 'bcryptjs';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { jsonResponse } from '@/lib/api-utils';
import { setCustomerCookie, signCustomerToken } from '@/lib/auth';

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const email = body?.email ? String(body.email).toLowerCase() : '';
  const password = body?.password ? String(body.password) : '';

  if (!email || !password) {
    return jsonResponse({ error: 'Email and password are required' }, 400);
  }

  const user = await prisma.customer.findUnique({ where: { email } });
  if (!user) return jsonResponse({ error: 'Invalid credentials' }, 401);

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return jsonResponse({ error: 'Invalid credentials' }, 401);

  const token = signCustomerToken({ id: user.id, email: user.email, full_name: user.fullName });
  const response = NextResponse.json({ user: { id: user.id, name: user.fullName, email: user.email } });
  setCustomerCookie(response, token);
  return response;
}
