import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { jsonResponse } from '@/lib/api-utils';

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const email = body?.email ? String(body.email).toLowerCase() : '';
  if (!email) return jsonResponse({ error: 'Email is required' }, 400);

  const user = await prisma.customer.findUnique({ where: { email } });
  if (!user) {
    return jsonResponse({ ok: true });
  }

  const token = crypto.randomBytes(24).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

  await prisma.passwordReset.create({
    data: {
      customerId: user.id,
      tokenHash,
      expiresAt,
    },
  });

  const origin = new URL(request.url).origin;
  const resetUrl = `${origin}/reset-password?token=${token}`;
  return jsonResponse({ ok: true, resetUrl });
}
