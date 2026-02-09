import type { Product } from '@/types';

export type ApiProductRow = {
  id: number;
  name: string;
  description: string | null;
  price: number | string;
  original_price: number | string | null;
  stock_count: number | null;
  in_stock: boolean | number | null;
  images: unknown;
  features?: unknown;
  image_labels?: unknown;
  category_name?: string | null;
  category_slug?: string | null;
  review_count?: number | string | null;
  rating_avg?: number | string | null;
  created_at?: string;
};

const toNumber = (value: unknown, fallback = 0) => {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  }
  return fallback;
};

const toBoolean = (value: unknown, fallback = false) => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') return value === '1' || value.toLowerCase() === 'true';
  return fallback;
};

const toStringArray = (value: unknown) => {
  if (Array.isArray(value)) return value.filter((v) => typeof v === 'string' && v.trim()).map((v) => v.trim());
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.filter((v) => typeof v === 'string' && v.trim()).map((v) => v.trim());
    } catch {
      // ignore
    }
  }
  return [] as string[];
};

const toStringArrayPreserveEmpty = (value: unknown) => {
  if (Array.isArray(value)) return value.map((v) => (typeof v === 'string' ? v.trim() : ''));
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.map((v) => (typeof v === 'string' ? v.trim() : ''));
    } catch {
      // ignore
    }
  }
  return [] as string[];
};

export const apiRowToProduct = (row: ApiProductRow): Product => {
  const images = toStringArray(row.images);
  const features = toStringArray(row.features);
  const imageLabels = toStringArrayPreserveEmpty(row.image_labels);
  const originalPriceRaw = row.original_price;
  const originalPriceNumber = originalPriceRaw === null || originalPriceRaw === undefined ? undefined : Number(originalPriceRaw);
  const originalPrice = Number.isFinite(originalPriceNumber) ? originalPriceNumber : undefined;

  // Prefer the image labeled "Front" as the primary thumbnail (index 0)
  const frontIndex = imageLabels.findIndex((l) => l.trim().toLowerCase() === 'front');
  const normalizedImages = images.length ? [...images] : ['/placeholder.svg'];
  const normalizedLabels = imageLabels.length ? [...imageLabels] : [];
  if (frontIndex > 0 && frontIndex < normalizedImages.length) {
    const [frontImage] = normalizedImages.splice(frontIndex, 1);
    normalizedImages.unshift(frontImage);

    if (frontIndex < normalizedLabels.length) {
      const [frontLabel] = normalizedLabels.splice(frontIndex, 1);
      normalizedLabels.unshift(frontLabel);
    }
  }

  return {
    id: String(row.id),
    name: row.name,
    description: row.description ?? '',
    price: toNumber(row.price),
    originalPrice,
    images: normalizedImages,
    imageLabels: normalizedLabels,
    category: row.category_name || 'Uncategorized',
    categorySlug: row.category_slug || undefined,
    features,
    tags: [],
    rating: toNumber(row.rating_avg, 0),
    reviewCount: toNumber(row.review_count, 0),
    inStock: toBoolean(row.in_stock, true),
    stockCount: row.stock_count ?? 0,
    featured: false,
    createdAt: row.created_at ?? new Date().toISOString(),
  };
};
