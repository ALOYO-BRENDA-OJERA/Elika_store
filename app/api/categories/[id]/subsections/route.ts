import { prisma } from '@/lib/prisma';
import { jsonResponse } from '@/lib/api-utils';
import { getAdminFromCookies } from '@/lib/auth';

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const admin = getAdminFromCookies();
  if (!admin || (await admin).role !== 'admin') return jsonResponse({ error: 'Unauthorized' }, 401);

  const rows = await prisma.categorySubsection.findMany({
    where: { categoryId: Number(params.id) },
    orderBy: { name: 'asc' },
  });

  return jsonResponse(
    rows.map((s) => ({
      id: s.id,
      category_id: s.categoryId,
      name: s.name,
      slug: s.slug,
      created_at: s.createdAt,
    }))
  );
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const admin = await getAdminFromCookies();
  if (!admin || admin.role !== 'admin') return jsonResponse({ error: 'Unauthorized' }, 401);

  const body = await request.json().catch(() => null);
  const name = body?.name ? String(body.name) : '';
  const slug = body?.slug ? String(body.slug) : '';

  if (!name || !slug) return jsonResponse({ error: 'Name and slug are required' }, 400);

  const subsection = await prisma.categorySubsection.create({
    data: { name, slug, categoryId: Number(params.id) },
  });

  return jsonResponse(
    { id: subsection.id, category_id: subsection.categoryId, name: subsection.name, slug: subsection.slug },
    201
  );
}
