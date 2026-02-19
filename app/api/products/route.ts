import { prisma } from '@/lib/prisma';
import { jsonResponse, parseJsonStringArrayPreserveEmpty, parseStringArray, coerceNumber } from '@/lib/api-utils';
import { getAdminFromCookies } from '@/lib/auth';
import { saveUploadFile } from '@/lib/uploads';

export const runtime = 'nodejs';

export async function GET() {
  const products = await prisma.product.findMany({
    include: { category: true, subsection: true },
    orderBy: { createdAt: 'desc' },
  });

  const reviewStats = await prisma.review.groupBy({
    by: ['productId'],
    _count: { _all: true },
    _avg: { rating: true },
  });

  const statsMap = new Map(reviewStats.map((s) => [s.productId, s]));

  const payload = products.map((p) => {
    const stats = statsMap.get(p.id);
    return {
      ...p,
      category_name: p.category?.name ?? null,
      category_slug: p.category?.slug ?? null,
      subsection_name: p.subsection?.name ?? null,
      subsection_slug: p.subsection?.slug ?? null,
      review_count: stats?._count?._all ?? 0,
      rating_avg: stats?._avg?.rating ?? 0,
    };
  });

  return jsonResponse(payload);
}

export async function POST(request: Request) {
  const admin = await getAdminFromCookies();
  if (!admin || admin.role !== 'admin') return jsonResponse({ error: 'Unauthorized' }, 401);

  const formData = await request.formData();
  const name = String(formData.get('name') || '').trim();
  const description = String(formData.get('description') || '').trim();
  const price = coerceNumber(formData.get('price')) ?? 0;
  const stockCount = coerceNumber(formData.get('stock_count')) ?? 0;
  const categoryId = coerceNumber(formData.get('category_id')) ?? null;
  const subsectionId = coerceNumber(formData.get('subsection_id')) ?? null;

  const features = parseStringArray(formData.get('features'));
  const imageLabels = parseJsonStringArrayPreserveEmpty(formData.get('image_labels'));

  const frontFile = formData.get('front_image');
  const backFile = formData.get('back_image');
  const imagesFiles = formData.getAll('images');

  let imagesArray: string[] = [];
  let effectiveImageLabels = imageLabels;

  if (frontFile || backFile) {
    if (!(frontFile instanceof File) || !(backFile instanceof File)) {
      return jsonResponse({ error: 'Please upload both Front Image and Back Image' }, 400);
    }
    const frontPath = await saveUploadFile(frontFile);
    const backPath = await saveUploadFile(backFile);
    imagesArray = [frontPath, backPath];
    effectiveImageLabels = ['Front', 'Back'];
  } else if (imagesFiles.length > 0) {
    const uploaded = await Promise.all(
      imagesFiles.filter((f): f is File => f instanceof File).map((f) => saveUploadFile(f))
    );
    imagesArray = uploaded;
  }

  const product = await prisma.product.create({
    data: {
      name,
      description,
      price,
      stockCount,
      categoryId,
      subsectionId,
      images: imagesArray,
      imageLabels: effectiveImageLabels,
      features,
    },
  });

  return jsonResponse({
    id: product.id,
    name: product.name,
    description: product.description,
    price: product.price,
    stock_count: product.stockCount,
    category_id: product.categoryId,
    subsection_id: product.subsectionId,
    images: product.images,
    features: product.features,
    image_labels: product.imageLabels,
  }, 201);
}
