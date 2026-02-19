import { prisma } from '@/lib/prisma';
import { jsonResponse } from '@/lib/api-utils';
import { getAdminFromCookies } from '@/lib/auth';

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const admin = getAdminFromCookies();
  if (!admin || admin.role !== 'admin') return jsonResponse({ error: 'Unauthorized' }, 401);

  const body = await request.json().catch(() => null);
  const status = body?.status ? String(body.status).trim() : '';
  if (!status) return jsonResponse({ error: 'Status is required' }, 400);

  await prisma.contactMessage.update({
    where: { id: Number(params.id) },
    data: { status },
  });

  return jsonResponse({}, 204);
}
