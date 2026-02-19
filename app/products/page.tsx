"use client";

import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Grid, List, ChevronDown } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { ProductGrid } from '@/components/products/ProductGrid';
import { ProductFiltersComponent } from '@/components/products/ProductFilters';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useQuery } from '@tanstack/react-query';
import { ProductFilters } from '@/types';
import { apiRowToProduct, type ApiProductRow } from '@/lib/api';

const DEFAULT_MAX_PRICE = 500000;

const sortOptions = [
  { value: 'newest', label: 'Newest First' },
  { value: 'price-asc', label: 'Price: Low to High' },
  { value: 'price-desc', label: 'Price: High to Low' },
  { value: 'rating', label: 'Highest Rated' },
  { value: 'popular', label: 'Most Popular' },
];

export default function ProductsPage() {
  const searchParams = useSearchParams();
  const searchQuery = searchParams.get('search') || '';
  const categoryParam = searchParams.get('category') || '';

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['public-products'],
    queryFn: async () => {
      const response = await fetch('/api/products');
      if (!response.ok) throw new Error('Failed to fetch products');
      const rows = (await response.json()) as ApiProductRow[];
      return rows.map(apiRowToProduct);
    },
  });

  const dynamicMaxPrice = useMemo(() => {
    const max = products.reduce((acc, p) => Math.max(acc, p.price), DEFAULT_MAX_PRICE);
    return Math.ceil(max / 10000) * 10000;
  }, [products]);

  const [filters, setFilters] = useState<ProductFilters>({
    search: searchQuery,
    category: categoryParam,
    minPrice: 0,
    maxPrice: DEFAULT_MAX_PRICE,
    inStock: false,
    sortBy: 'newest',
  });

  useEffect(() => {
    if (dynamicMaxPrice <= DEFAULT_MAX_PRICE) return;
    setFilters((prev) => {
      if (prev.maxPrice !== DEFAULT_MAX_PRICE) return prev;
      return { ...prev, maxPrice: dynamicMaxPrice };
    });
  }, [dynamicMaxPrice]);

  useEffect(() => {
    setFilters((prev) => ({
      ...prev,
      search: searchQuery,
      category: categoryParam,
    }));
  }, [searchQuery, categoryParam]);

  const filteredProducts = useMemo(() => {
    let result = [...products];
    if (filters.search) {
      const query = filters.search.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.description.toLowerCase().includes(query) ||
          p.tags.some((t) => t.toLowerCase().includes(query))
      );
    }
    if (filters.category) {
      result = result.filter(
        (p) => {
          const slug = (p.categorySlug || (p.category || '').toLowerCase().replace(/\s+/g, '-')).toLowerCase();
          return slug === filters.category.toLowerCase();
        }
      );
    }
    result = result.filter(
      (p) => p.price >= filters.minPrice && p.price <= filters.maxPrice
    );
    if (filters.inStock) {
      result = result.filter((p) => p.inStock);
    }
    switch (filters.sortBy) {
      case 'price-asc':
        result.sort((a, b) => a.price - b.price);
        break;
      case 'price-desc':
        result.sort((a, b) => b.price - a.price);
        break;
      case 'rating':
        result.sort((a, b) => b.rating - a.rating);
        break;
      case 'popular':
        result.sort((a, b) => b.reviewCount - a.reviewCount);
        break;
      case 'newest':
      default:
        result.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
    }
    return result;
  }, [filters, products]);

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="font-display text-3xl md:text-4xl font-bold mb-2">
            {filters.category
              ? filters.category.replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())
              : 'All Products'}
          </h1>
          <p className="text-muted-foreground">
            {filteredProducts.length} products found
            {filters.search && ` for "${filters.search}"`}
          </p>
        </div>
        <div className="flex gap-8">
          <ProductFiltersComponent
            filters={filters}
            onFiltersChange={setFilters}
            maxPrice={dynamicMaxPrice}
          />
          <div className="flex-1">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-border">
              <div className="flex items-center gap-2 lg:hidden">
                <ProductFiltersComponent
                  filters={filters}
                  onFiltersChange={setFilters}
                  maxPrice={dynamicMaxPrice}
                />
              </div>
              <div className="flex items-center gap-4 ml-auto">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground hidden sm:inline">
                    Sort by:
                  </span>
                  <Select
                    value={filters.sortBy}
                    onValueChange={(value: ProductFilters['sortBy']) =>
                      setFilters({ ...filters, sortBy: value })
                    }
                  >
                    <SelectTrigger className="w-[160px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {sortOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <ProductGrid products={filteredProducts} isLoading={isLoading} />
          </div>
        </div>
      </div>
    </Layout>
  );
}
