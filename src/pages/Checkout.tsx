"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronRight, Phone, ShieldCheck, Lock, Truck, Banknote } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { useCart } from '@/contexts/CartContext';
import { formatPrice } from '@/data/products';
import { toast } from 'sonner';

type PaymentMethod = 'mtn_momo' | 'airtel_money' | 'pay_on_delivery';
type PaymentTiming = 'pay_now' | 'pay_on_delivery';

export default function Checkout() {
  const router = useRouter();
  const { items, subtotal, shipping, tax, total, clearCart } = useCart();
  const [paymentTiming, setPaymentTiming] = useState<PaymentTiming>('pay_now');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('mtn_momo');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAuthChecking, setIsAuthChecking] = useState(true);

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    street: '',
    city: '',
    region: '',
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  useEffect(() => {
    let active = true;
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/customer/me', { credentials: 'include' });
        if (!response.ok) {
          router.replace('/login?return=/checkout');
          return;
        }
      } finally {
        if (active) setIsAuthChecking(false);
      }
    };
    checkAuth();
    return () => {
      active = false;
    };
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    if (!formData.fullName || !formData.email || !formData.phone || !formData.street || !formData.city) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsProcessing(true);

    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          customer: {
            fullName: formData.fullName,
            email: formData.email,
            phone: formData.phone,
            street: formData.street,
            city: formData.city,
            region: formData.region,
          },
          paymentMethod,
          paymentStatus: paymentTiming === 'pay_on_delivery' ? 'pending' : 'pending',
          shipping,
          tax,
          items: items.map((it) => ({
            productId: it.product.id,
            quantity: it.quantity,
          })),
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error || `Failed to place order (${response.status})`);
      }

      const created = (await response.json().catch(() => null)) as
        | { orderNumber?: string; id?: number }
        | null;

      const orderNumber = created?.orderNumber;

      toast.success('Order placed successfully!', {
        description:
          paymentTiming === 'pay_now'
            ? 'You will receive a payment prompt on your phone.'
            : 'Your order has been placed. Pay when your order arrives.',
      });

      clearCart();
      const params = new URLSearchParams();
      if (orderNumber) params.set('orderNumber', orderNumber);
      params.set('nextSteps', '1');
      router.push(`/orders?${params.toString()}`);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to place order');
    } finally {
      setIsProcessing(false);
    }
  };

  if (isAuthChecking) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-16 text-center">
          <p className="text-muted-foreground">Checking your account…</p>
        </div>
      </Layout>
    );
  }

  if (items.length === 0) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-16 text-center">
          <h1 className="font-display text-3xl font-bold mb-4">
            Your Cart is Empty
          </h1>
          <p className="text-muted-foreground mb-8">
            Add some items to your cart before checking out.
          </p>
          <Button asChild>
            <Link href="/products">Browse Products</Link>
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-8">
          <Link href="/" className="hover:text-foreground transition-colors">
            Home
          </Link>
          <ChevronRight className="h-4 w-4" />
          <Link href="/cart" className="hover:text-foreground transition-colors">
            Cart
          </Link>
          <ChevronRight className="h-4 w-4" />
          <span className="text-foreground">Checkout</span>
        </nav>

        <h1 className="font-display text-3xl md:text-4xl font-bold mb-8">
          Checkout
        </h1>

        <form onSubmit={handleSubmit}>
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Checkout Form */}
            <div className="lg:col-span-2 space-y-8">
              {/* Contact Information */}
              <div className="bg-card rounded-xl p-6 shadow-sm">
                <h2 className="font-display text-xl font-semibold mb-6">
                  Contact Information
                </h2>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name *</Label>
                    <Input
                      id="fullName"
                      name="fullName"
                      value={formData.fullName}
                      onChange={handleInputChange}
                      placeholder="Enter your full name"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address *</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="Enter your email"
                      required
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="phone">Phone Number *</Label>
                    <Input
                      id="phone"
                      name="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={handleInputChange}
                      placeholder="e.g., 0772 123 456"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Shipping Address */}
              <div className="bg-card rounded-xl p-6 shadow-sm">
                <h2 className="font-display text-xl font-semibold mb-6">
                  Shipping Address
                </h2>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="street">Street Address *</Label>
                    <Input
                      id="street"
                      name="street"
                      value={formData.street}
                      onChange={handleInputChange}
                      placeholder="Enter your street address"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="city">City *</Label>
                    <Input
                      id="city"
                      name="city"
                      value={formData.city}
                      onChange={handleInputChange}
                      placeholder="Enter your city"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="region">Region</Label>
                    <Input
                      id="region"
                      name="region"
                      value={formData.region}
                      onChange={handleInputChange}
                      placeholder="Enter your region"
                    />
                  </div>
                </div>
              </div>

              {/* Payment Timing */}
              <div className="bg-card rounded-xl p-6 shadow-sm">
                <h2 className="font-display text-xl font-semibold mb-6">
                  When do you want to pay?
                </h2>
                <RadioGroup
                  value={paymentTiming}
                  onValueChange={(value) => {
                    setPaymentTiming(value as PaymentTiming);
                    if (value === 'pay_on_delivery') {
                      setPaymentMethod('pay_on_delivery');
                    } else {
                      setPaymentMethod('mtn_momo');
                    }
                  }}
                  className="space-y-4"
                >
                  <label
                    htmlFor="pay_now"
                    className={`flex items-center gap-4 p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                      paymentTiming === 'pay_now'
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <RadioGroupItem value="pay_now" id="pay_now" />
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Phone className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">Pay Now (Mobile Money)</p>
                      <p className="text-sm text-muted-foreground">
                        Complete payment instantly via MTN MoMo or Airtel Money
                      </p>
                    </div>
                  </label>

                  <label
                    htmlFor="pay_on_delivery"
                    className={`flex items-center gap-4 p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                      paymentTiming === 'pay_on_delivery'
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <RadioGroupItem value="pay_on_delivery" id="pay_on_delivery" />
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Truck className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">Pay on Delivery</p>
                      <p className="text-sm text-muted-foreground">
                        Pay with cash when your order arrives
                      </p>
                    </div>
                  </label>
                </RadioGroup>
              </div>

              {/* Mobile Money Options - Only show if Pay Now is selected */}
              {paymentTiming === 'pay_now' && (
                <div className="bg-card rounded-xl p-6 shadow-sm">
                  <h2 className="font-display text-xl font-semibold mb-6">
                    Select Mobile Money Provider
                  </h2>
                  <RadioGroup
                    value={paymentMethod}
                    onValueChange={(value) => setPaymentMethod(value as PaymentMethod)}
                    className="space-y-4"
                  >
                    <label
                      htmlFor="mtn_momo"
                      className={`flex items-center gap-4 p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                        paymentMethod === 'mtn_momo'
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <RadioGroupItem value="mtn_momo" id="mtn_momo" />
                      <div className="w-12 h-12 rounded-lg bg-yellow-400 flex items-center justify-center font-bold text-black text-xs">
                        MTN
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">MTN Mobile Money</p>
                        <p className="text-sm text-muted-foreground">
                          Pay securely with MTN MoMo
                        </p>
                      </div>
                      <Phone className="h-5 w-5 text-muted-foreground" />
                    </label>

                    <label
                      htmlFor="airtel_money"
                      className={`flex items-center gap-4 p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                        paymentMethod === 'airtel_money'
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <RadioGroupItem value="airtel_money" id="airtel_money" />
                      <div className="w-12 h-12 rounded-lg bg-red-600 flex items-center justify-center font-bold text-white text-xs">
                        Airtel
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">Airtel Money</p>
                        <p className="text-sm text-muted-foreground">
                          Pay securely with Airtel Money
                        </p>
                      </div>
                      <Phone className="h-5 w-5 text-muted-foreground" />
                    </label>
                  </RadioGroup>
                </div>
              )}

              {/* Pay on Delivery Info */}
              {paymentTiming === 'pay_on_delivery' && (
                <div className="bg-card rounded-xl p-6 shadow-sm">
                  <div className="flex items-center gap-4 p-4 rounded-lg bg-secondary/50">
                    <Banknote className="h-8 w-8 text-primary shrink-0" />
                    <div>
                      <p className="font-medium">Cash on Delivery</p>
                      <p className="text-sm text-muted-foreground">
                        Please have the exact amount ready when our delivery agent arrives.
                        Payment will be collected upon delivery of your order.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2 p-4 rounded-lg bg-secondary/50">
                <ShieldCheck className="h-5 w-5 text-success shrink-0" />
                <p className="text-sm text-muted-foreground">
                  {paymentTiming === 'pay_now'
                    ? 'Your payment information is encrypted and secure. You will receive a payment prompt on your registered mobile number.'
                    : 'Your order details are secure. Our delivery agent will collect payment upon delivery.'}
                </p>
              </div>
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <div className="bg-card rounded-xl p-6 shadow-sm sticky top-24">
                <h2 className="font-display text-xl font-semibold mb-6">
                  Order Summary
                </h2>

                {/* Items */}
                <div className="space-y-4 max-h-64 overflow-y-auto mb-4">
                  {items.map((item) => (
                    <div key={item.product.id} className="flex gap-3">
                      <div className="w-16 h-16 rounded-lg bg-muted overflow-hidden shrink-0">
                        <img
                          src={item.product.images[0]}
                          alt={item.product.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm line-clamp-1">
                          {item.product.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Qty: {item.quantity}
                        </p>
                        <p className="text-sm font-medium mt-1">
                          {formatPrice(item.product.price * item.quantity)}
                        </p>
                      </div>
                    </div>
                  ))}
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

                <Button
                  type="submit"
                  size="lg"
                  className="w-full btn-primary gap-2"
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <>Processing...</>
                  ) : (
                    <>
                      <Lock className="h-4 w-4" />
                      Place Order
                    </>
                  )}
                </Button>

                <p className="text-xs text-muted-foreground text-center mt-4">
                  By placing this order, you agree to our Terms of Service and
                  Privacy Policy
                </p>
              </div>
            </div>
          </div>
        </form>
      </div>
    </Layout>
  );
}
