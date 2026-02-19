import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { jsonResponse } from '@/lib/api-utils';

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const token = body?.token ? String(body.token) : '';
  const password = body?.password ? String(body.password) : '';

  if (!token || !password) {
    return jsonResponse({ error: 'Token and new password are required' }, 400);
  }

  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

  const reset = await prisma.passwordReset.findFirst({
    where: {
      tokenHash,
      usedAt: null,
      expiresAt: { gt: new Date() },
    },
  });

  if (!reset) return jsonResponse({ error: 'Invalid or expired token' }, 400);

  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.customer.update({
    where: { id: reset.customerId },
    data: { passwordHash },
  });

  await prisma.passwordReset.update({
    where: { id: reset.id },
    data: { usedAt: new Date() },
  });

  return jsonResponse({ ok: true });
}
