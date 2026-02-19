import { prisma } from '@/lib/prisma';
import { jsonResponse } from '@/lib/api-utils';
import { getAdminFromCookies } from '@/lib/auth';

export async function GET() {
  const categories = await prisma.category.findMany({
    orderBy: { name: 'asc' },
    include: { _count: { select: { products: true } } },
  });

  const payload = categories.map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    image: c.image,
    created_at: c.createdAt,
    productCount: c._count.products,
  }));

  return jsonResponse(payload);
}

export async function POST(request: Request) {
  const admin = await getAdminFromCookies();
  if (!admin || admin.role !== 'admin') return jsonResponse({ error: 'Unauthorized' }, 401);

  const body = await request.json().catch(() => null);
  const name = body?.name ? String(body.name) : '';
  const slug = body?.slug ? String(body.slug) : '';
  const image = body?.image ? String(body.image) : null;

  if (!name || !slug) return jsonResponse({ error: 'Name and slug are required' }, 400);

  const category = await prisma.category.create({
    data: { name, slug, image },
  });

  return jsonResponse({ id: category.id, name: category.name, slug: category.slug, image: category.image }, 201);
}
