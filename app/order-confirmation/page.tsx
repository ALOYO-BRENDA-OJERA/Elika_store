"use client";

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { CheckCircle, Package, ArrowRight } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';

export default function OrderConfirmationPage() {
  const params = useSearchParams();
  const orderNumber = params.get('orderNumber');

  return (
    <Layout>
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-lg mx-auto text-center">
          <div className="w-20 h-20 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="h-10 w-10 text-success" />
          </div>
          <h1 className="font-display text-3xl md:text-4xl font-bold mb-4">
            Order Confirmed!
          </h1>
          <p className="text-muted-foreground mb-8">
            Thank you for your purchase! Your order has been received and is being
            processed. You will receive a confirmation SMS with your order details
            shortly.
          </p>
          {orderNumber ? (
            <div className="bg-card rounded-xl p-4 shadow-sm mb-8 text-left">
              <p className="text-sm text-muted-foreground">Order Number</p>
              <p className="font-semibold text-lg">{orderNumber}</p>
              <div className="mt-3">
                <Button asChild variant="outline" size="sm">
                  <Link href="/orders">Track this order</Link>
                </Button>
              </div>
            </div>
          ) : null}
          <div className="bg-card rounded-xl p-6 shadow-sm mb-8">
            <div className="flex items-center justify-center gap-3 mb-4">
              <Package className="h-6 w-6 text-primary" />
              <span className="font-semibold">What's Next?</span>
            </div>
            <ul className="text-left text-sm text-muted-foreground space-y-3">
              <li className="flex items-start gap-2">
                <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-medium shrink-0">
                  1
                </span>
                <span>
                  You'll receive a payment prompt on your registered mobile number
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-medium shrink-0">
                  2
                </span>
                <span>Complete the mobile money payment to confirm your order</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-medium shrink-0">
                  3
                </span>
                <span>
                  Once payment is confirmed, your order will be shipped within 1-2
                  business days
                </span>
              </li>
            </ul>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg" className="btn-primary gap-2">
              <Link href="/products">
                Continue Shopping
                <ArrowRight className="h-5 w-5" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/orders">My Orders</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/">Back to Home</Link>
            </Button>
          </div>
        </div>
      </div>
    </Layout>
  );
}
