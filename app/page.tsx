'use client';

import Link from 'next/link';
import { ArrowRight, Truck, Shield, RefreshCw, Headphones, Star, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Layout } from '@/components/layout/Layout';
import { ProductCard } from '@/components/products/ProductCard';
import { products as mockProducts, categories as mockCategories } from '@/data/products';
import heroBanner from '@/assets/hero-banner.jpg';
import { useQuery } from '@tanstack/react-query';
import { apiRowToProduct, type ApiProductRow } from '@/lib/api';

type ApiCategoryRow = {
  id: number;
  name: string;
  slug: string;
  image?: string | null;
  productCount?: number | string | null;
};

const features = [
  {
    icon: Truck,
    title: 'Free Shipping',
    description: 'On orders over UGX 200,000',
  },
  {
    icon: Shield,
    title: 'Secure Payment',
    description: 'MTN & Airtel Mobile Money',
  },
  {
    icon: RefreshCw,
    title: 'Easy Returns',
    description: '30-day return policy',
  },
  {
    icon: Headphones,
    title: '24/7 Support',
    description: 'Dedicated customer service',
  },
];

export default function HomePage() {
  const { data: productRows = [] } = useQuery({
    queryKey: ['home-products'],
    queryFn: async () => {
      const response = await fetch('/api/products');
      if (!response.ok) throw new Error('Failed to fetch products');
      return response.json() as Promise<ApiProductRow[]>;
    },
    retry: false,
  });

  const { data: categoryRows = [] } = useQuery({
    queryKey: ['home-categories'],
    queryFn: async () => {
      const response = await fetch('/api/categories');
      if (!response.ok) throw new Error('Failed to fetch categories');
      return response.json() as Promise<ApiCategoryRow[]>;
    },
    retry: false,
  });

  const apiProducts = Array.isArray(productRows) && productRows.length
    ? productRows.map(apiRowToProduct)
    : [];

  const productsToShow = apiProducts.length ? apiProducts : mockProducts;

  const categoriesToShow = Array.isArray(categoryRows) && categoryRows.length
    ? categoryRows.map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        productCount: Number(c.productCount ?? 0) || 0,
      }))
    : mockCategories;

  const featuredProducts = productsToShow.slice(0, 4);
  const newArrivals = productsToShow.slice(0, 8);

  return (
    <Layout>
      <section className="relative h-[70vh] min-h-[500px] max-h-[800px] overflow-hidden">
        <div className="absolute inset-0">
          <img
            src={heroBanner}
            alt="Elika Premium Shopping"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-foreground/80 via-foreground/50 to-transparent" />
        </div>
        <div className="relative container mx-auto px-4 h-full flex items-center">
          <div className="max-w-xl animate-slide-up">
            <span className="inline-block px-4 py-1.5 rounded-full bg-primary/20 text-primary text-sm font-medium mb-4">
              New Collection 2024
            </span>
            <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold text-background leading-tight mb-4">
              Discover Premium Quality Products
            </h1>
            <p className="text-background/80 text-lg mb-8 max-w-md">
              Experience the finest selection of products, from electronics to fashion, all at exceptional prices.
            </p>
            <div className="flex flex-wrap gap-4">
              <Button asChild size="lg" className="btn-primary text-base gap-2">
                <Link href="/products">
                  Shop Now
                  <ArrowRight className="h-5 w-5" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="bg-background/10 border-background/30 text-background hover:bg-background/20 text-base">
                <Link href="/categories">Browse Categories</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="py-8 border-b border-border bg-secondary/50">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {features.map((feature) => (
              <div key={feature.title} className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <feature.icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium text-sm">{feature.title}</h3>
                  <p className="text-xs text-muted-foreground">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="font-display text-3xl font-bold mb-2">Shop by Category</h2>
              <p className="text-muted-foreground">Find exactly what you're looking for</p>
            </div>
            <Button asChild variant="ghost" className="hidden md:flex gap-1">
              <Link href="/categories">
                View All <ChevronRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {categoriesToShow.map((category) => (
              <Link
                key={category.id}
                href={`/products?category=${category.slug}`}
                className="group relative aspect-square rounded-xl overflow-hidden bg-muted"
              >
                <div className="absolute inset-0 bg-gradient-to-t from-foreground/80 via-foreground/20 to-transparent" />
                <div className="absolute inset-0 flex flex-col items-center justify-end p-4 text-center">
                  <h3 className="font-medium text-background mb-1 group-hover:text-primary transition-colors">
                    {category.name}
                  </h3>
                  <p className="text-xs text-background/70">
                    {category.productCount} Products
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 bg-secondary/30">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="font-display text-3xl font-bold mb-2">Featured Products</h2>
              <p className="text-muted-foreground">Handpicked favorites just for you</p>
            </div>
            <Button asChild variant="ghost" className="hidden md:flex gap-1">
              <Link href="/products?featured=true">
                View All <ChevronRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {featuredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-primary to-gold-light p-8 md:p-12">
            <div className="relative z-10 max-w-lg">
              <span className="inline-block px-3 py-1 rounded-full bg-background/20 text-background text-sm font-medium mb-4">
                Limited Time Offer
              </span>
              <h2 className="font-display text-3xl md:text-4xl font-bold text-background mb-4">
                Get 20% Off Your First Order
              </h2>
              <p className="text-background/80 mb-6">
                Sign up today and receive an exclusive discount code for your first purchase. Don't miss out!
              </p>
              <Button asChild size="lg" className="bg-background text-foreground hover:bg-background/90">
                <Link href="/signup">Create Account</Link>
              </Button>
            </div>
            <div className="absolute right-0 top-0 bottom-0 w-1/2 hidden lg:block">
              <div className="absolute inset-0 bg-gradient-to-r from-primary to-transparent" />
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 bg-secondary/50">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-8">
            <div>
              <h2 className="font-display text-3xl font-bold mb-2">What Our Customers Say</h2>
              <p className="text-muted-foreground max-w-xl">
                Join thousands of satisfied customers who trust Elika for their everyday essentials and premium products.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6 w-full md:w-auto">
              {[4.8, 10_000, 98].map((stat, index) => (
                <div
                  key={index}
                  className="bg-background rounded-xl p-4 shadow-sm border border-border/60 flex flex-col items-center text-center"
                >
                  <div className="flex items-center justify-center mb-2">
                    {index === 0 && (
                      <>
                        <span className="text-3xl font-bold mr-1">{stat}</span>
                        <Star className="h-5 w-5 text-gold" />
                      </>
                    )}
                    {index === 1 && (
                      <span className="text-3xl font-bold">
                        {stat.toLocaleString()}+
                      </span>
                    )}
                    {index === 2 && (
                      <span className="text-3xl font-bold">{stat}%</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {index === 0 && 'Average customer rating'}
                    {index === 1 && 'Orders delivered successfully'}
                    {index === 2 && 'Customer satisfaction rate'}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 mb-8">
            <div>
              <h2 className="font-display text-3xl font-bold mb-2">New Arrivals</h2>
              <p className="text-muted-foreground">
                Discover the latest additions to our collection
              </p>
            </div>
            <Button asChild variant="outline" className="w-full md:w-auto">
              <Link href="/products">View All Products</Link>
            </Button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {newArrivals.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      </section>
    </Layout>
  );
}
