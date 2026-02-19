import { prisma } from '@/lib/prisma';
import { jsonResponse } from '@/lib/api-utils';
import { getAdminFromCookies } from '@/lib/auth';

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const name = body?.name ? String(body.name).trim() : '';
  const email = body?.email ? String(body.email).trim() : '';
  const phone = body?.phone ? String(body.phone).trim() : null;
  const subject = body?.subject ? String(body.subject).trim() : null;
  const message = body?.message ? String(body.message).trim() : '';

  if (!name || !email || !message) {
    return jsonResponse({ error: 'Name, email, and message are required' }, 400);
  }

  const created = await prisma.contactMessage.create({
    data: { name, email, phone, subject, message },
  });

  return jsonResponse({ id: created.id }, 201);
}

export async function GET() {
  const admin = getAdminFromCookies();
  if (!admin || admin.role !== 'admin') return jsonResponse({ error: 'Unauthorized' }, 401);

  const rows = await prisma.contactMessage.findMany({
    orderBy: { createdAt: 'desc' },
    take: 200,
  });

  return jsonResponse(
    rows.map((r) => ({
      id: r.id,
      name: r.name,
      email: r.email,
      phone: r.phone,
      subject: r.subject,
      message: r.message,
      status: r.status,
      created_at: r.createdAt,
    }))
  );
}
