import { prisma } from '@/lib/prisma';
import { jsonResponse } from '@/lib/api-utils';
import { getCustomerFromCookies } from '@/lib/auth';
import { parseOrderNumber, formatOrderNumber } from '@/lib/order-utils';

export async function GET(_: Request, { params }: { params: { orderNumber: string } }) {
  const customer = getCustomerFromCookies();
  if (!customer) return jsonResponse({ error: 'Unauthorized' }, 401);

  const orderId = parseOrderNumber(params.orderNumber);
  if (!orderId) return jsonResponse({ error: 'Invalid order number' }, 400);

  const order = await prisma.order.findFirst({
    where: { id: orderId, customerId: Number(customer.sub) },
  });

  if (!order) return jsonResponse({ error: 'Order not found' }, 404);

  const items = await prisma.orderItem.findMany({
    where: { orderId },
    orderBy: { id: 'asc' },
  });

  return jsonResponse({
    id: order.id,
    orderNumber: formatOrderNumber(order.id),
    customer: {
      name: order.customerName,
      email: order.email,
      phone: order.phone,
      street: order.street,
      city: order.city,
      region: order.region,
    },
    status: order.status,
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus,
    subtotal: Number(order.subtotal || 0),
    shipping: Number(order.shipping || 0),
    tax: Number(order.tax || 0),
    total: Number(order.total || 0),
    createdAt: order.createdAt,
    items: items.map((it) => ({
      id: it.id,
      productId: it.productId,
      name: it.productName,
      quantity: it.quantity,
      unitPrice: Number(it.unitPrice),
      lineTotal: Number(it.lineTotal),
    })),
  });
}
