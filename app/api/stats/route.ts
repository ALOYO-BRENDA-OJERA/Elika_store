import { prisma } from '@/lib/prisma';
import { jsonResponse } from '@/lib/api-utils';
import { getAdminFromCookies } from '@/lib/auth';

export async function GET() {
  const admin = getAdminFromCookies();
  if (!admin || admin.role !== 'admin') return jsonResponse({ error: 'Unauthorized' }, 401);

  const [productCount, categoryCount] = await Promise.all([
    prisma.product.count(),
    prisma.category.count(),
  ]);

  const [totalValueRow] = (await prisma.$queryRaw`
    SELECT SUM(price * stock_count) AS totalValue FROM products
  `) as Array<{ totalValue: number | null }>;

  const topProducts = (await prisma.$queryRaw`
    SELECT p.id, p.name, p.price,
           COALESCE(rv.review_count, 0) AS review_count
    FROM products p
    LEFT JOIN (
      SELECT product_id, COUNT(*) AS review_count
      FROM reviews
      GROUP BY product_id
    ) rv ON rv.product_id = p.id
    ORDER BY rv.review_count DESC, p.created_at DESC
    LIMIT 5
  `) as Array<{ id: number; name: string; price: number; review_count: number }>;

  const recentOrders = (await prisma.$queryRaw`
    SELECT id, customer_name, total, status, created_at
    FROM orders
    ORDER BY created_at DESC
    LIMIT 5
  `) as Array<{ id: number; customer_name: string; total: number; status: string; created_at: Date }>;

  const recentContacts = (await prisma.$queryRaw`
    SELECT id, name, subject, created_at
    FROM contact_messages
    ORDER BY created_at DESC
    LIMIT 5
  `) as Array<{ id: number; name: string; subject: string | null; created_at: Date }>;

  return jsonResponse({
    productCount,
    categoryCount,
    totalValue: totalValueRow?.totalValue || 0,
    topProducts,
    recentOrders: recentOrders.map((o) => ({
      id: o.id,
      customer_name: o.customer_name,
      total: o.total,
      status: o.status,
      created_at: o.created_at,
    })),
    recentContacts: recentContacts.map((c) => ({
      id: c.id,
      name: c.name,
      subject: c.subject,
      date: c.created_at,
    })),
  });
}
