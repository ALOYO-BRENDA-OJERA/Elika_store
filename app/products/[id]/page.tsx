"use client";

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ChevronRight,
  Heart,
  Minus,
  Plus,
  Share2,
  ShoppingBag,
  Star,
  Truck,
  Shield,
  RefreshCw,
} from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { ProductCard } from '@/components/products/ProductCard';
import { products as mockProducts, formatPrice } from '@/data/products';
import { useCart } from '@/contexts/CartContext';
import { useQuery } from '@tanstack/react-query';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/skeleton';
import { apiRowToProduct, type ApiProductRow } from '@/lib/api';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function ProductDetailPage() {
  const params = useParams();
  const id = typeof params?.id === 'string' ? params.id : '';
  const { addItem } = useCart();
  const router = useRouter();
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);
  const [reviewName, setReviewName] = useState('');
  const [reviewRating, setReviewRating] = useState('5');
  const [reviewComment, setReviewComment] = useState('');
  const queryClient = useQueryClient();

  const { data: product, isLoading } = useQuery({
    queryKey: ['product', id],
    queryFn: async () => {
      const response = await fetch(`/api/products/${id}`);
      if (!response.ok) throw new Error('Product not found');
      const row = (await response.json()) as ApiProductRow;
      return apiRowToProduct(row);
    },
  });

  const { data: reviews = [] } = useQuery({
    queryKey: ['product-reviews', id],
    queryFn: async () => {
      const response = await fetch(`/api/products/${id}/reviews`);
      if (!response.ok) throw new Error('Failed to fetch reviews');
      return response.json() as Promise<
        { id: number; name: string; rating: number; comment: string; created_at: string }[]
      >;
    },
    enabled: !!id,
    retry: false,
  });

  const addReviewMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/products/${id}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: reviewName,
          rating: Number(reviewRating),
          comment: reviewComment,
        }),
      });
      if (!response.ok) throw new Error('Failed to submit review');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-reviews', id] });
      queryClient.invalidateQueries({ queryKey: ['product', id] });
      queryClient.invalidateQueries({ queryKey: ['public-products'] });
      queryClient.invalidateQueries({ queryKey: ['home-products'] });
      setReviewName('');
      setReviewRating('5');
      setReviewComment('');
    },
  });

  const ratingSummary = useMemo(() => {
    const fallbackAverage = 0;
    const fallbackCount = 0;
    if (!product) return { average: fallbackAverage, count: fallbackCount };
    if (!reviews.length) {
      return { average: product.rating, count: product.reviewCount };
    }
    const count = reviews.length;
    const sum = reviews.reduce((acc, r) => acc + (Number(r.rating) || 0), 0);
    const average = Math.round((sum / count) * 10) / 10;
    return { average, count };
  }, [reviews, product]);

  if (isLoading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <Skeleton className="h-96 w-full" />
        </div>
      </Layout>
    );
  }

  if (!product) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-16 text-center">
          <h1 className="font-display text-3xl font-bold mb-4">Product Not Found</h1>
          <p className="text-muted-foreground mb-8">
            The product you're looking for doesn't exist or has been removed.
          </p>
          <Button asChild>
            <Link href="/products">Browse Products</Link>
          </Button>
        </div>
      </Layout>
    );
  }

  const relatedProducts = mockProducts
    .filter((p) => p.category === product.category && p.id !== product.id)
    .slice(0, 4);

  const discount = product.originalPrice
    ? Math.round(
        ((product.originalPrice - product.price) / product.originalPrice) * 100
      )
    : 0;

  const activeImage = product.images[selectedImage] ?? product.images[0];

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-8">
          <Link href="/" className="hover:text-foreground transition-colors">
            Home
          </Link>
          <ChevronRight className="h-4 w-4" />
          <Link href="/products" className="hover:text-foreground transition-colors">
            Products
          </Link>
          <ChevronRight className="h-4 w-4" />
          <Link
            href={`/products?category=${product.category.toLowerCase().replace(/\s+/g, '-')}`}
            className="hover:text-foreground transition-colors"
          >
            {product.category}
          </Link>
          {product.subcategory ? (
            <>
              <ChevronRight className="h-4 w-4" />
              <span className="text-foreground">{product.subcategory}</span>
            </>
          ) : null}
          <ChevronRight className="h-4 w-4" />
          <span className="text-foreground">{product.name}</span>
        </nav>

        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">
          <div className="space-y-4">
            <div className="aspect-square rounded-2xl overflow-hidden bg-muted">
              <img
                src={activeImage}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            </div>
            {product.imageLabels && product.imageLabels.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {product.imageLabels.map((label, index) => (
                  label.trim() ? (
                    <Button
                      key={`${label}-${index}`}
                      type="button"
                      variant={selectedImage === index ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSelectedImage(index)}
                      disabled={index >= product.images.length}
                    >
                      {label}
                    </Button>
                  ) : null
                ))}
              </div>
            )}
            <div className="flex gap-2">
              {product.images.map((img, idx) => (
                <Button
                  key={img}
                  type="button"
                  variant={selectedImage === idx ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedImage(idx)}
                >
                  <img src={img} alt={product.name} className="w-8 h-8 object-cover rounded" />
                </Button>
              ))}
            </div>
          </div>
          <div className="space-y-6">
            <div className="flex items-center gap-2">
              <h2 className="font-display text-2xl font-bold">
                {product.name}
              </h2>
              {discount > 0 && (
                <Badge variant="destructive">-{discount}%</Badge>
              )}
            </div>
            <div className="flex items-center gap-4">
              <span className="text-2xl font-bold">
                {formatPrice(product.price)}
              </span>
              {product.originalPrice && (
                <span className="text-muted-foreground line-through">
                  {formatPrice(product.originalPrice)}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Star className="h-5 w-5 text-gold" />
              <span className="font-medium">
                {ratingSummary.average} ({ratingSummary.count} reviews)
              </span>
            </div>
            <p className="text-muted-foreground">
              {product.description}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <span className="w-10 text-center font-medium">
                {quantity}
              </span>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setQuantity(quantity + 1)}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <Button
              className="btn-primary w-full"
              onClick={() => addItem(product, quantity)}
            >
              Add to Cart
            </Button>
            <div className="flex gap-2 mt-4">
              <Button variant="ghost" size="icon">
                <Heart className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon">
                <Share2 className="h-5 w-5" />
              </Button>
            </div>
            <div className="flex gap-4 mt-6">
              <div className="flex items-center gap-2">
                <Truck className="h-5 w-5 text-primary" />
                <span className="text-sm">Free shipping on orders over UGX 200,000</span>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                <span className="text-sm">Secure payment</span>
              </div>
              <div className="flex items-center gap-2">
                <RefreshCw className="h-5 w-5 text-primary" />
                <span className="text-sm">Easy returns</span>
              </div>
            </div>
          </div>
        </div>
        <Separator className="my-12" />
        <Tabs defaultValue="reviews" className="w-full">
          <TabsList>
            <TabsTrigger value="reviews">Reviews</TabsTrigger>
            <TabsTrigger value="related">Related Products</TabsTrigger>
          </TabsList>
          <TabsContent value="reviews">
            <div className="space-y-6">
              <div className="space-y-2">
                <h3 className="font-display text-xl font-semibold">Customer Reviews</h3>
                {reviews.length === 0 ? (
                  <p className="text-muted-foreground">No reviews yet.</p>
                ) : (
                  <div className="space-y-4">
                    {reviews.map((review) => (
                      <div key={review.id} className="bg-card rounded-lg p-4 shadow-sm">
                        <div className="flex items-center gap-2 mb-2">
                          <Star className="h-4 w-4 text-gold" />
                          <span className="font-medium">{review.rating}</span>
                          <span className="text-xs text-muted-foreground ml-auto">
                            {new Date(review.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="font-semibold mb-1">{review.name}</div>
                        <div className="text-sm text-muted-foreground">{review.comment}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <Separator className="my-6" />
              <div className="space-y-4">
                <h4 className="font-display text-lg font-semibold">Add a Review</h4>
                <form
                  onSubmit={e => {
                    e.preventDefault();
                    addReviewMutation.mutate();
                  }}
                  className="space-y-3"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="review-name">Name</Label>
                      <Input
                        id="review-name"
                        value={reviewName}
                        onChange={e => setReviewName(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="review-rating">Rating</Label>
                      <Select
                        value={reviewRating}
                        onValueChange={setReviewRating}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {[5, 4, 3, 2, 1].map(r => (
                            <SelectItem key={r} value={String(r)}>
                              {r}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="review-comment">Comment</Label>
                    <Textarea
                      id="review-comment"
                      value={reviewComment}
                      onChange={e => setReviewComment(e.target.value)}
                      required
                    />
                  </div>
                  <Button type="submit" className="btn-primary">
                    Submit Review
                  </Button>
                </form>
              </div>
            </div>
          </TabsContent>
          <TabsContent value="related">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {relatedProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
