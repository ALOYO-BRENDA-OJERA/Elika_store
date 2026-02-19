import { prisma } from '@/lib/prisma';
import { jsonResponse } from '@/lib/api-utils';
import { getCustomerFromCookies } from '@/lib/auth';
import { formatOrderNumber } from '@/lib/order-utils';

export async function GET() {
  const customer = getCustomerFromCookies();
  if (!customer) return jsonResponse({ error: 'Unauthorized' }, 401);

  const rows = await prisma.order.findMany({
    where: { customerId: Number(customer.sub) },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });

  return jsonResponse(
    rows.map((r) => ({
      id: r.id,
      orderNumber: formatOrderNumber(r.id),
      total: Number(r.total || 0),
      status: r.status,
      paymentStatus: r.paymentStatus,
      date: r.createdAt,
    }))
  );
}
