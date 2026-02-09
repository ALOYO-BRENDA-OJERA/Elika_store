import { useState } from 'react';
import { ChevronDown, SlidersHorizontal, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { categories as mockCategories } from '@/data/products';
import { ProductFilters } from '@/types';
import { formatPrice } from '@/data/products';
import { useQuery } from '@tanstack/react-query';

type ApiCategoryRow = {
  id: number;
  name: string;
  slug: string;
  productCount?: number | string | null;
};

interface ProductFiltersComponentProps {
  filters: ProductFilters;
  onFiltersChange: (filters: ProductFilters) => void;
  maxPrice: number;
}

function FilterContent({
  filters,
  onFiltersChange,
  maxPrice,
}: ProductFiltersComponentProps) {
  const { data: categoryRows = [] } = useQuery({
    queryKey: ['public-categories'],
    queryFn: async () => {
      const response = await fetch('/api/categories');
      if (!response.ok) throw new Error('Failed to fetch categories');
      return response.json() as Promise<ApiCategoryRow[]>;
    },
    retry: false,
  });

  const categories = Array.isArray(categoryRows) && categoryRows.length
    ? categoryRows.map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        productCount: Number(c.productCount ?? 0) || 0,
      }))
    : mockCategories;

  return (
    <div className="space-y-6">
      {/* Categories */}
      <Collapsible defaultOpen>
        <CollapsibleTrigger className="flex items-center justify-between w-full py-2 font-medium">
          Categories
          <ChevronDown className="h-4 w-4" />
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-2 space-y-2">
          <div className="flex items-center gap-2">
            <Checkbox
              id="all-categories"
              checked={filters.category === ''}
              onCheckedChange={() =>
                onFiltersChange({ ...filters, category: '' })
              }
            />
            <Label htmlFor="all-categories" className="cursor-pointer text-sm">
              All Categories
            </Label>
          </div>
          {categories.map((category) => (
            <div key={category.id} className="flex items-center gap-2">
              <Checkbox
                id={category.slug}
                checked={filters.category === category.slug}
                onCheckedChange={() =>
                  onFiltersChange({ ...filters, category: category.slug })
                }
              />
              <Label htmlFor={category.slug} className="cursor-pointer text-sm flex-1">
                {category.name}
              </Label>
              <span className="text-xs text-muted-foreground">
                ({category.productCount})
              </span>
            </div>
          ))}
        </CollapsibleContent>
      </Collapsible>

      {/* Price Range */}
      <Collapsible defaultOpen>
        <CollapsibleTrigger className="flex items-center justify-between w-full py-2 font-medium">
          Price Range
          <ChevronDown className="h-4 w-4" />
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-4 space-y-4">
          <Slider
            min={0}
            max={maxPrice}
            step={10000}
            value={[filters.minPrice, filters.maxPrice]}
            onValueChange={([min, max]) =>
              onFiltersChange({ ...filters, minPrice: min, maxPrice: max })
            }
            className="w-full"
          />
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {formatPrice(filters.minPrice)}
            </span>
            <span className="text-muted-foreground">
              {formatPrice(filters.maxPrice)}
            </span>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Availability */}
      <Collapsible defaultOpen>
        <CollapsibleTrigger className="flex items-center justify-between w-full py-2 font-medium">
          Availability
          <ChevronDown className="h-4 w-4" />
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-2 space-y-2">
          <div className="flex items-center gap-2">
            <Checkbox
              id="in-stock"
              checked={filters.inStock}
              onCheckedChange={(checked) =>
                onFiltersChange({ ...filters, inStock: !!checked })
              }
            />
            <Label htmlFor="in-stock" className="cursor-pointer text-sm">
              In Stock Only
            </Label>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Clear Filters */}
      <Button
        variant="outline"
        className="w-full"
        onClick={() =>
          onFiltersChange({
            search: '',
            category: '',
            minPrice: 0,
            maxPrice: maxPrice,
            inStock: false,
            sortBy: 'newest',
          })
        }
      >
        <X className="h-4 w-4 mr-2" />
        Clear Filters
      </Button>
    </div>
  );
}

export function ProductFiltersComponent({
  filters,
  onFiltersChange,
  maxPrice,
}: ProductFiltersComponentProps) {
  return (
    <>
      {/* Desktop Filters */}
      <div className="hidden lg:block w-64 shrink-0">
        <div className="sticky top-24">
          <h2 className="font-display text-lg font-semibold mb-4">Filters</h2>
          <FilterContent
            filters={filters}
            onFiltersChange={onFiltersChange}
            maxPrice={maxPrice}
          />
        </div>
      </div>

      {/* Mobile Filters */}
      <div className="lg:hidden">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" className="gap-2">
              <SlidersHorizontal className="h-4 w-4" />
              Filters
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[300px]">
            <SheetHeader>
              <SheetTitle>Filters</SheetTitle>
            </SheetHeader>
            <div className="mt-6">
              <FilterContent
                filters={filters}
                onFiltersChange={onFiltersChange}
                maxPrice={maxPrice}
              />
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}
