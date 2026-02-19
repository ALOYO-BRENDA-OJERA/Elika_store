import { prisma } from '@/lib/prisma';
import { jsonResponse, coerceNumber } from '@/lib/api-utils';

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const reviews = await prisma.review.findMany({
    where: { productId: Number(params.id) },
    orderBy: { createdAt: 'desc' },
  });

  return jsonResponse(
    reviews.map((r) => ({
      id: r.id,
      product_id: r.productId,
      name: r.name,
      rating: r.rating,
      comment: r.comment,
      created_at: r.createdAt,
    }))
  );
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const body = await request.json().catch(() => null);
  const name = body?.name ? String(body.name) : '';
  const comment = body?.comment ? String(body.comment) : '';
  const rating = coerceNumber(body?.rating) ?? 0;

  if (!name || !comment || rating < 1 || rating > 5) {
    return jsonResponse({ error: 'Name, rating (1-5), and comment are required' }, 400);
  }

  const review = await prisma.review.create({
    data: {
      productId: Number(params.id),
      name: name.trim(),
      rating,
      comment: comment.trim(),
    },
  });

  return jsonResponse(
    {
      id: review.id,
      product_id: review.productId,
      name: review.name,
      rating: review.rating,
      comment: review.comment,
      created_at: review.createdAt,
    },
    201
  );
}
