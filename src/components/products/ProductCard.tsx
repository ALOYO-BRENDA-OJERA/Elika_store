import { Link } from 'react-router-dom';
import { Heart, ShoppingBag, Star } from 'lucide-react';
import { Product } from '@/types';
import { formatPrice } from '@/data/products';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useCart } from '@/contexts/CartContext';

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const { addItem } = useCart();
  const discount = product.originalPrice
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
    : 0;

  return (
    <div className="group relative bg-card rounded-xl overflow-hidden card-hover">
      {/* Image container */}
      <Link to={`/products/${product.id}`} className="block aspect-square overflow-hidden bg-muted">
        <img
          src={product.images[0]}
          alt={product.name}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
        />
      </Link>

      {/* Badges */}
      <div className="absolute top-3 left-3 flex flex-col gap-2">
        {product.featured && (
          <Badge className="bg-primary text-primary-foreground">Featured</Badge>
        )}
        {discount > 0 && (
          <Badge variant="destructive">-{discount}%</Badge>
        )}
        {!product.inStock && (
          <Badge variant="secondary">Out of Stock</Badge>
        )}
      </div>

      {/* Quick actions */}
      <div className="absolute top-3 right-3 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          variant="secondary"
          size="icon"
          className="h-9 w-9 rounded-full bg-background/90 backdrop-blur-sm shadow-md"
        >
          <Heart className="h-4 w-4" />
        </Button>
      </div>

      {/* Add to cart button - appears on hover */}
      <div className="absolute bottom-20 left-3 right-3 opacity-0 group-hover:opacity-100 transition-all transform translate-y-2 group-hover:translate-y-0">
        <Button
          onClick={(e) => {
            e.preventDefault();
            addItem(product);
          }}
          disabled={!product.inStock}
          className="w-full btn-primary gap-2"
        >
          <ShoppingBag className="h-4 w-4" />
          Add to Cart
        </Button>
      </div>

      {/* Product info */}
      <div className="p-4">
        <Link to={`/products/${product.id}`}>
          <p className="text-xs text-muted-foreground mb-1">{product.category}</p>
          <h3 className="font-medium text-foreground line-clamp-2 mb-2 group-hover:text-primary transition-colors">
            {product.name}
          </h3>
        </Link>

        {/* Rating */}
        <div className="flex items-center gap-1 mb-2">
          <Star className="h-4 w-4 fill-primary text-primary" />
          <span className="text-sm font-medium">{product.rating}</span>
          <span className="text-xs text-muted-foreground">
            ({product.reviewCount} reviews)
          </span>
        </div>

        {/* Price */}
        <div className="flex items-center gap-2">
          <span className="font-semibold text-foreground">
            {formatPrice(product.price)}
          </span>
          {product.originalPrice && (
            <span className="text-sm text-muted-foreground line-through">
              {formatPrice(product.originalPrice)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
