import { prisma } from '@/lib/prisma';
import { jsonResponse, coerceNumber } from '@/lib/api-utils';
import { getAdminFromCookies, getCustomerFromCookies } from '@/lib/auth';
import { formatOrderNumber } from '@/lib/order-utils';

export async function GET() {
  const admin = getAdminFromCookies();
  if (!admin || admin.role !== 'admin') return jsonResponse({ error: 'Unauthorized' }, 401);

  const orders = await prisma.order.findMany({
    orderBy: { createdAt: 'desc' },
    take: 200,
  });

  const itemsTotals = await prisma.orderItem.groupBy({
    by: ['orderId'],
    _sum: { quantity: true },
  });
  const itemsMap = new Map(itemsTotals.map((r) => [r.orderId, r._sum.quantity ?? 0]));

  return jsonResponse(
    orders.map((o) => ({
      id: o.id,
      orderNumber: formatOrderNumber(o.id),
      customer: o.customerName,
      email: o.email,
      phone: o.phone,
      items: itemsMap.get(o.id) ?? 0,
      total: Number(o.total || 0),
      status: o.status,
      paymentMethod: o.paymentMethod,
      paymentStatus: o.paymentStatus,
      date: o.createdAt,
    }))
  );
}

export async function POST(request: Request) {
  const customer = getCustomerFromCookies();
  if (!customer) return jsonResponse({ error: 'Unauthorized' }, 401);

  const body = await request.json().catch(() => null);
  const customerPayload = body?.customer || {};
  const items = Array.isArray(body?.items) ? body.items : [];

  const customerName = String(customerPayload.fullName || '').trim();
  const email = String(customerPayload.email || '').trim();
  const phone = String(customerPayload.phone || '').trim();
  const street = String(customerPayload.street || '').trim();
  const city = String(customerPayload.city || '').trim();
  const region = customerPayload.region ? String(customerPayload.region).trim() : null;
  const paymentMethod = String(body?.paymentMethod || '').trim();
  const paymentStatus = String(body?.paymentStatus || 'pending').trim();
  const shipping = coerceNumber(body?.shipping) ?? 0;
  const tax = coerceNumber(body?.tax) ?? 0;
  const status = 'pending';

  if (!customerName || !email || !phone || !street || !city) {
    return jsonResponse({ error: 'Missing customer fields' }, 400);
  }

  if (!items.length) return jsonResponse({ error: 'Order items are required' }, 400);

  const normalizedItems = items
    .map((item) => ({
      productId: coerceNumber(item?.productId),
      quantity: coerceNumber(item?.quantity) ?? 0,
    }))
    .filter((item) => item.productId && item.quantity > 0);

  if (!normalizedItems.length) return jsonResponse({ error: 'Invalid order items' }, 400);

  const productIds = normalizedItems.map((i) => i.productId as number);
  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
  });
  const productsById = new Map(products.map((p) => [p.id, p]));

  for (const item of normalizedItems) {
    if (!productsById.get(item.productId as number)) {
      return jsonResponse({ error: `Unknown product id: ${item.productId}` }, 400);
    }
  }

  let subtotal = 0;
  const itemRows = normalizedItems.map((i) => {
    const p = productsById.get(i.productId as number)!;
    const unit = Number(p.price);
    const line = unit * Number(i.quantity);
    subtotal += line;
    return {
      productId: p.id,
      productName: p.name,
      quantity: Number(i.quantity),
      unitPrice: unit,
      lineTotal: line,
    };
  });

  const total = Number(subtotal) + Number(shipping) + Number(tax);

  const orderId = await prisma.$transaction(async (tx) => {
    const created = await tx.order.create({
      data: {
        customerId: Number(customer.sub),
        customerName,
        email,
        phone,
        street,
        city,
        region,
        status,
        paymentMethod,
        paymentStatus,
        subtotal,
        shipping,
        tax,
        total,
      },
    });

    await tx.orderItem.createMany({
      data: itemRows.map((row) => ({
        orderId: created.id,
        productId: row.productId,
        productName: row.productName,
        quantity: row.quantity,
        unitPrice: row.unitPrice,
        lineTotal: row.lineTotal,
      })),
    });

    return created.id;
  });

  return jsonResponse(
    {
      id: orderId,
      orderNumber: formatOrderNumber(orderId),
      total,
      status,
      paymentStatus,
    },
    201
  );
}
