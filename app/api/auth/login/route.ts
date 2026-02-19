import bcrypt from 'bcryptjs';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { jsonResponse } from '@/lib/api-utils';
import { setAdminCookie, signAdminToken } from '@/lib/auth';

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const username = body?.username ? String(body.username) : '';
  const password = body?.password ? String(body.password) : '';

  if (!username || !password) {
    return jsonResponse({ error: 'Username and password are required' }, 400);
  }

  const user = await prisma.user.findUnique({ where: { username } });
  if (!user) return jsonResponse({ error: 'Invalid credentials' }, 401);

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return jsonResponse({ error: 'Invalid credentials' }, 401);

  const token = signAdminToken({ id: user.id, username: user.username, role: user.role });
  const response = NextResponse.json({ ok: true });
  setAdminCookie(response, token);
  return response;
}
