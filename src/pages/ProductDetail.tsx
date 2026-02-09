import { useMemo, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
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

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const { addItem } = useCart();
  const navigate = useNavigate();
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
            <Link to="/products">Browse Products</Link>
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
          <Link to="/" className="hover:text-foreground transition-colors">
            Home
          </Link>
          <ChevronRight className="h-4 w-4" />
          <Link to="/products" className="hover:text-foreground transition-colors">
            Products
          </Link>
          <ChevronRight className="h-4 w-4" />
          <Link
            to={`/products?category=${product.category.toLowerCase().replace(/\s+/g, '-')}`}
            className="hover:text-foreground transition-colors"
          >
            {product.category}
          </Link>
          <ChevronRight className="h-4 w-4" />
          <span className="text-foreground">{product.name}</span>
        </nav>

        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">
          {/* Product Images */}
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

            {product.images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-2">
                {product.images.map((image, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImage(index)}
                    className={`w-20 h-20 rounded-lg overflow-hidden shrink-0 border-2 transition-colors ${
                      selectedImage === index
                        ? 'border-primary'
                        : 'border-transparent'
                    }`}
                  >
                    <img
                      src={image}
                      alt={`${product.name} ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Info */}
          <div className="space-y-6">
            {/* Badges */}
            <div className="flex gap-2">
              {product.featured && (
                <Badge className="bg-primary text-primary-foreground">Featured</Badge>
              )}
              {discount > 0 && <Badge variant="destructive">-{discount}% Off</Badge>}
              {!product.inStock && <Badge variant="secondary">Out of Stock</Badge>}
            </div>

            {/* Title & Category */}
            <div>
              <p className="text-sm text-muted-foreground mb-1">{product.category}</p>
              <h1 className="font-display text-3xl md:text-4xl font-bold">
                {product.name}
              </h1>
            </div>

            {/* Rating */}
            <div className="flex items-center gap-2">
              <div className="flex gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={`h-5 w-5 ${
                      i < Math.floor(ratingSummary.average)
                        ? 'fill-primary text-primary'
                        : 'text-muted-foreground'
                    }`}
                  />
                ))}
              </div>
              <span className="font-medium">{ratingSummary.average}</span>
              <span className="text-muted-foreground">
                ({ratingSummary.count} reviews)
              </span>
            </div>

            {/* Price */}
            <div className="flex items-baseline gap-3">
              <span className="font-display text-3xl font-bold text-foreground">
                {formatPrice(product.price)}
              </span>
              {product.originalPrice && (
                <span className="text-lg text-muted-foreground line-through">
                  {formatPrice(product.originalPrice)}
                </span>
              )}
            </div>

            <Separator />

            {/* Description */}
            <p className="text-muted-foreground leading-relaxed">
              {product.description}
            </p>

            {/* Quantity Selector */}
            <div className="flex items-center gap-4">
              <span className="font-medium">Quantity:</span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  disabled={quantity <= 1}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="w-12 text-center font-medium">{quantity}</span>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setQuantity(quantity + 1)}
                  disabled={quantity >= product.stockCount}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <span className="text-sm text-muted-foreground">
                {product.stockCount} available
              </span>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <Button
                size="lg"
                className="flex-1 btn-primary gap-2"
                disabled={!product.inStock}
                onClick={() => {
                  addItem(product, quantity);
                  navigate('/cart');
                }}
              >
                <ShoppingBag className="h-5 w-5" />
                Place Order
              </Button>
              <Button variant="outline" size="lg">
                <Heart className="h-5 w-5" />
              </Button>
              <Button variant="outline" size="lg">
                <Share2 className="h-5 w-5" />
              </Button>
            </div>

            {/* Features */}
            <div className="grid grid-cols-3 gap-4 pt-4">
              <div className="text-center p-4 rounded-lg bg-secondary/50">
                <Truck className="h-6 w-6 mx-auto mb-2 text-primary" />
                <p className="text-xs text-muted-foreground">Free Shipping</p>
              </div>
              <div className="text-center p-4 rounded-lg bg-secondary/50">
                <Shield className="h-6 w-6 mx-auto mb-2 text-primary" />
                <p className="text-xs text-muted-foreground">Secure Payment</p>
              </div>
              <div className="text-center p-4 rounded-lg bg-secondary/50">
                <RefreshCw className="h-6 w-6 mx-auto mb-2 text-primary" />
                <p className="text-xs text-muted-foreground">30-Day Returns</p>
              </div>
            </div>

            {/* Tags */}
            <div className="flex flex-wrap gap-2">
              {product.tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        {/* Product Tabs */}
        <div className="mt-16">
          <Tabs defaultValue="description" className="w-full">
            <TabsList className="w-full justify-start border-b rounded-none bg-transparent h-auto p-0">
              <TabsTrigger
                value="description"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-3"
              >
                Description
              </TabsTrigger>
              <TabsTrigger
                value="reviews"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-3"
              >
                Reviews ({ratingSummary.count})
              </TabsTrigger>
              <TabsTrigger
                value="shipping"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-3"
              >
                Shipping & Returns
              </TabsTrigger>
            </TabsList>
            <TabsContent value="description" className="pt-6">
              <div className="prose prose-neutral max-w-none">
                <p className="text-muted-foreground leading-relaxed">
                  {product.description}
                </p>
                <h3 className="font-display text-xl font-semibold mt-6 mb-4">
                  Product Features
                </h3>
                {product.features && product.features.length > 0 ? (
                  <ul className="list-disc list-inside text-muted-foreground space-y-2">
                    {product.features.map((feature) => (
                      <li key={feature}>{feature}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-muted-foreground">No features provided for this product yet.</p>
                )}
              </div>
            </TabsContent>
            <TabsContent value="reviews" className="pt-6">
              <div className="grid gap-8 lg:grid-cols-2">
                <div className="space-y-4">
                  {reviews.length === 0 ? (
                    <p className="text-muted-foreground">No reviews yet. Be the first to review this product!</p>
                  ) : (
                    reviews.map((r) => (
                      <div key={r.id} className="rounded-lg border bg-card p-4">
                        <div className="flex items-center justify-between gap-4">
                          <p className="font-medium">{r.name}</p>
                          <div className="flex items-center gap-1">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star
                                key={i}
                                className={`h-4 w-4 ${i < r.rating ? 'fill-primary text-primary' : 'text-muted-foreground'}`}
                              />
                            ))}
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground mt-2 whitespace-pre-line">{r.comment}</p>
                      </div>
                    ))
                  )}
                </div>

                <div className="rounded-lg border bg-card p-4 space-y-4">
                  <h3 className="font-display text-lg font-semibold">Add a Review</h3>
                  <div className="space-y-2">
                    <Label htmlFor="review-name">Your name</Label>
                    <Input
                      id="review-name"
                      value={reviewName}
                      onChange={(e) => setReviewName(e.target.value)}
                      placeholder="e.g. John"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Rating</Label>
                    <Select value={reviewRating} onValueChange={setReviewRating}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select rating" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="5">5 - Excellent</SelectItem>
                        <SelectItem value="4">4 - Good</SelectItem>
                        <SelectItem value="3">3 - Average</SelectItem>
                        <SelectItem value="2">2 - Poor</SelectItem>
                        <SelectItem value="1">1 - Bad</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="review-comment">Comment</Label>
                    <Textarea
                      id="review-comment"
                      value={reviewComment}
                      onChange={(e) => setReviewComment(e.target.value)}
                      placeholder="Write your review..."
                      rows={4}
                    />
                  </div>
                  <Button
                    className="btn-primary"
                    disabled={addReviewMutation.isPending || !reviewName.trim() || !reviewComment.trim()}
                    onClick={() => addReviewMutation.mutate()}
                  >
                    {addReviewMutation.isPending ? 'Submitting...' : 'Submit Review'}
                  </Button>
                </div>
              </div>
            </TabsContent>
            <TabsContent value="shipping" className="pt-6">
              <div className="space-y-6 text-muted-foreground">
                <div>
                  <h3 className="font-display text-xl font-semibold text-foreground mb-3">
                    Shipping Information
                  </h3>
                  <ul className="list-disc list-inside space-y-2">
                    <li>Free shipping on orders over UGX 200,000</li>
                    <li>Standard delivery: 3-5 business days</li>
                    <li>Express delivery: 1-2 business days (additional fee)</li>
                    <li>We ship to all major cities in Uganda</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-display text-xl font-semibold text-foreground mb-3">
                    Return Policy
                  </h3>
                  <ul className="list-disc list-inside space-y-2">
                    <li>30-day return policy for unused items</li>
                    <li>Items must be in original packaging</li>
                    <li>Free returns for defective products</li>
                    <li>Refunds processed within 5-7 business days</li>
                  </ul>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <div className="mt-16">
            <h2 className="font-display text-2xl font-bold mb-8">
              You May Also Like
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
              {relatedProducts.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
