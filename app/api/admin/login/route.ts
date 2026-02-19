import bcrypt from 'bcryptjs';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { jsonResponse } from '@/lib/api-utils';
import { setAdminCookie, signAdminToken, clearCustomerCookie } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const username = body?.username ? String(body.username) : '';
    const password = body?.password ? String(body.password) : '';

    if (!username || !password) {
      return jsonResponse({ error: 'Username and password are required' }, 400);
    }

    const user = await prisma.user.findUnique({ where: { username } });
    if (!user) {
      console.error('Admin login error: user not found', { username });
      return jsonResponse({ error: 'Invalid credentials' }, 401);
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      console.error('Admin login error: invalid password', { username });
      return jsonResponse({ error: 'Invalid credentials' }, 401);
    }

    const token = signAdminToken({ id: user.id, username: user.username, role: user.role });
    const response = NextResponse.json({ user: { id: user.id, username: user.username, role: user.role } });
    setAdminCookie(response, token);
    clearCustomerCookie(response);
    return response;
  } catch (error) {
    console.error('Admin login error:', error);
    return jsonResponse({ error: 'Internal Server Error', details: error instanceof Error ? error.message : String(error) }, 500);
  }
}
