import { prisma } from '@/lib/prisma';
import { jsonResponse } from '@/lib/api-utils';
import { getAdminFromCookies } from '@/lib/auth';

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const admin = getAdminFromCookies();
  if (!admin || admin.role !== 'admin') return jsonResponse({ error: 'Unauthorized' }, 401);

  const body = await request.json().catch(() => null);
  const name = body?.name ? String(body.name) : '';
  const slug = body?.slug ? String(body.slug) : '';

  if (!name || !slug) return jsonResponse({ error: 'Name and slug are required' }, 400);

  const subsection = await prisma.categorySubsection.update({
    where: { id: Number(params.id) },
    data: { name, slug },
  });

  return jsonResponse({ id: subsection.id, name: subsection.name, slug: subsection.slug });
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const admin = getAdminFromCookies();
  if (!admin || admin.role !== 'admin') return jsonResponse({ error: 'Unauthorized' }, 401);

  await prisma.categorySubsection.delete({ where: { id: Number(params.id) } });
  return jsonResponse({}, 204);
}
