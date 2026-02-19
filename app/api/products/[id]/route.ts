import { prisma } from '@/lib/prisma';
import { jsonResponse, parseJsonStringArrayPreserveEmpty, parseStringArray, coerceNumber } from '@/lib/api-utils';
import { getAdminFromCookies } from '@/lib/auth';
import { saveUploadFile } from '@/lib/uploads';

export const runtime = 'nodejs';

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const product = await prisma.product.findUnique({
    where: { id: Number(params.id) },
    include: { category: true, subsection: true },
  });

  if (!product) return jsonResponse({ error: 'Product not found' }, 404);

  const stats = await prisma.review.aggregate({
    where: { productId: product.id },
    _count: { _all: true },
    _avg: { rating: true },
  });

  return jsonResponse({
    ...product,
    category_name: product.category?.name ?? null,
    category_slug: product.category?.slug ?? null,
    subsection_name: product.subsection?.name ?? null,
    subsection_slug: product.subsection?.slug ?? null,
    review_count: stats._count._all ?? 0,
    rating_avg: stats._avg.rating ?? 0,
  });
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const admin = getAdminFromCookies();
  if (!admin || admin.role !== 'admin') return jsonResponse({ error: 'Unauthorized' }, 401);

  const formData = await request.formData();
  const name = String(formData.get('name') || '').trim();
  const description = String(formData.get('description') || '').trim();
  const price = coerceNumber(formData.get('price')) ?? 0;
  const stockCount = coerceNumber(formData.get('stock_count')) ?? 0;
  const categoryId = coerceNumber(formData.get('category_id')) ?? null;
  const subsectionId = coerceNumber(formData.get('subsection_id')) ?? null;

  const featuresValue = formData.get('features');
  const imageLabelsValue = formData.get('image_labels');

  const frontFile = formData.get('front_image');
  const backFile = formData.get('back_image');
  const imagesFiles = formData.getAll('images');

  const data: any = {
    name,
    description,
    price,
    stockCount,
    categoryId,
    subsectionId,
  };

  if (featuresValue !== null) {
    data.features = parseStringArray(featuresValue);
  }

  if (imageLabelsValue !== null) {
    data.imageLabels = parseJsonStringArrayPreserveEmpty(imageLabelsValue);
  }

  if (frontFile || backFile) {
    if (!(frontFile instanceof File) || !(backFile instanceof File)) {
      return jsonResponse({ error: 'Please upload both Front Image and Back Image' }, 400);
    }
    const frontPath = await saveUploadFile(frontFile);
    const backPath = await saveUploadFile(backFile);
    data.images = [frontPath, backPath];
    data.imageLabels = ['Front', 'Back'];
  } else if (imagesFiles.length > 0) {
    const uploaded = await Promise.all(
      imagesFiles.filter((f): f is File => f instanceof File).map((f) => saveUploadFile(f))
    );
    data.images = uploaded;
  }

  const product = await prisma.product.update({
    where: { id: Number(params.id) },
    data,
    include: { category: true, subsection: true },
  });

  return jsonResponse({
    ...product,
    category_name: product.category?.name ?? null,
    subsection_name: product.subsection?.name ?? null,
  });
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const admin = getAdminFromCookies();
  if (!admin || admin.role !== 'admin') return jsonResponse({ error: 'Unauthorized' }, 401);

  await prisma.product.delete({ where: { id: Number(params.id) } });
  return jsonResponse({}, 204);
}
