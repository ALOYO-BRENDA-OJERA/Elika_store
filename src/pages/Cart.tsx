import { Link } from 'react-router-dom';
import { Minus, Plus, Trash2, ShoppingBag, ArrowRight, Tag } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { useCart } from '@/contexts/CartContext';
import { formatPrice } from '@/data/products';

export default function Cart() {
  const {
    items,
    removeItem,
    updateQuantity,
    clearCart,
    subtotal,
    shipping,
    tax,
    total,
  } = useCart();

  if (items.length === 0) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-md mx-auto text-center">
            <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center mx-auto mb-6">
              <ShoppingBag className="h-10 w-10 text-muted-foreground" />
            </div>
            <h1 className="font-display text-3xl font-bold mb-4">
              Your Cart is Empty
            </h1>
            <p className="text-muted-foreground mb-8">
              Looks like you haven't added any items to your cart yet. Start
              shopping and discover amazing products!
            </p>
            <Button asChild size="lg" className="btn-primary gap-2">
              <Link to="/products">
                Start Shopping
                <ArrowRight className="h-5 w-5" />
              </Link>
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <h1 className="font-display text-3xl md:text-4xl font-bold mb-8">
          Shopping Cart
        </h1>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-4">
            {/* Header */}
            <div className="hidden md:grid grid-cols-12 gap-4 py-3 px-4 bg-secondary/50 rounded-lg text-sm font-medium text-muted-foreground">
              <div className="col-span-6">Product</div>
              <div className="col-span-2 text-center">Price</div>
              <div className="col-span-2 text-center">Quantity</div>
              <div className="col-span-2 text-right">Total</div>
            </div>

            {/* Items */}
            {items.map((item) => (
              <div
                key={item.product.id}
                className="grid md:grid-cols-12 gap-4 py-4 px-4 bg-card rounded-lg shadow-sm items-center"
              >
                {/* Product */}
                <div className="md:col-span-6 flex gap-4">
                  <Link
                    to={`/products/${item.product.id}`}
                    className="w-20 h-20 md:w-24 md:h-24 rounded-lg bg-muted overflow-hidden shrink-0"
                  >
                    <img
                      src={item.product.images[0]}
                      alt={item.product.name}
                      className="w-full h-full object-cover"
                    />
                  </Link>
                  <div className="flex-1 min-w-0">
                    <Link
                      to={`/products/${item.product.id}`}
                      className="font-medium hover:text-primary transition-colors line-clamp-2"
                    >
                      {item.product.name}
                    </Link>
                    <p className="text-sm text-muted-foreground mt-1">
                      {item.product.category}
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive/80 -ml-3 mt-1 md:hidden"
                      onClick={() => removeItem(item.product.id)}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Remove
                    </Button>
                  </div>
                </div>

                {/* Price */}
                <div className="md:col-span-2 text-center hidden md:block">
                  <span className="text-muted-foreground">
                    {formatPrice(item.product.price)}
                  </span>
                </div>

                {/* Quantity */}
                <div className="md:col-span-2 flex items-center justify-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() =>
                      updateQuantity(item.product.id, item.quantity - 1)
                    }
                  >
                    <Minus className="h-3 w-3" />
                  </Button>
                  <span className="w-10 text-center font-medium">
                    {item.quantity}
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() =>
                      updateQuantity(item.product.id, item.quantity + 1)
                    }
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>

                {/* Total */}
                <div className="md:col-span-2 flex items-center justify-between md:justify-end gap-4">
                  <span className="font-semibold">
                    {formatPrice(item.product.price * item.quantity)}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-destructive hidden md:inline-flex"
                    onClick={() => removeItem(item.product.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}

            {/* Cart Actions */}
            <div className="flex flex-wrap gap-4 pt-4">
              <Button asChild variant="outline">
                <Link to="/products">Continue Shopping</Link>
              </Button>
              <Button
                variant="ghost"
                className="text-destructive hover:text-destructive/80"
                onClick={clearCart}
              >
                Clear Cart
              </Button>
            </div>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-card rounded-xl p-6 shadow-sm sticky top-24">
              <h2 className="font-display text-xl font-semibold mb-4">
                Order Summary
              </h2>

              {/* Promo Code */}
              <div className="flex gap-2 mb-6">
                <Input placeholder="Promo code" className="flex-1" />
                <Button variant="outline">
                  <Tag className="h-4 w-4" />
                </Button>
              </div>

              <Separator className="my-4" />

              {/* Totals */}
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatPrice(subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Shipping</span>
                  <span>
                    {shipping === 0 ? (
                      <span className="text-success">Free</span>
                    ) : (
                      formatPrice(shipping)
                    )}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tax (18% VAT)</span>
                  <span>{formatPrice(tax)}</span>
                </div>
              </div>

              <Separator className="my-4" />

              <div className="flex justify-between font-semibold text-lg mb-6">
                <span>Total</span>
                <span>{formatPrice(total)}</span>
              </div>

              <Button asChild size="lg" className="w-full btn-primary gap-2">
                <Link to="/checkout">
                  Proceed to Checkout
                  <ArrowRight className="h-5 w-5" />
                </Link>
              </Button>

              <p className="text-xs text-muted-foreground text-center mt-4">
                Secure checkout powered by MTN MoMo & Airtel Money
              </p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
