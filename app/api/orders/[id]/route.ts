import { prisma } from '@/lib/prisma';
import { jsonResponse } from '@/lib/api-utils';
import { getAdminFromCookies } from '@/lib/auth';
import { formatOrderNumber } from '@/lib/order-utils';

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const admin = getAdminFromCookies();
  if (!admin || admin.role !== 'admin') return jsonResponse({ error: 'Unauthorized' }, 401);

  const orderId = Number(params.id);
  if (!Number.isFinite(orderId)) return jsonResponse({ error: 'Invalid order id' }, 400);

  const order = await prisma.order.findUnique({ where: { id: orderId } });
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

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const admin = getAdminFromCookies();
  if (!admin || admin.role !== 'admin') return jsonResponse({ error: 'Unauthorized' }, 401);

  const orderId = Number(params.id);
  if (!Number.isFinite(orderId)) return jsonResponse({ error: 'Invalid order id' }, 400);

  const body = await request.json().catch(() => null);
  const nextStatus = body?.status ? String(body.status).trim() : null;
  const nextPaymentStatus = body?.paymentStatus ? String(body.paymentStatus).trim() : null;

  if (!nextStatus && !nextPaymentStatus) {
    return jsonResponse({ error: 'No fields to update' }, 400);
  }

  await prisma.order.update({
    where: { id: orderId },
    data: {
      ...(nextStatus ? { status: nextStatus } : {}),
      ...(nextPaymentStatus ? { paymentStatus: nextPaymentStatus } : {}),
    },
  });

  return jsonResponse({}, 204);
}
