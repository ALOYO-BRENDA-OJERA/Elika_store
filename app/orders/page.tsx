"use client";

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { formatPrice } from '@/data/products';

type PublicOrder = {
  id: number;
  orderNumber: string;
  total: number;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  paymentStatus: 'pending' | 'completed' | 'failed';
  date: string;
};

type PublicOrderDetails = {
  id: number;
  orderNumber: string;
  customer: {
    name: string;
    email: string;
    phone: string;
    street: string;
    city: string;
    region?: string | null;
  };
  status: PublicOrder['status'];
  paymentMethod: string;
  paymentStatus: PublicOrder['paymentStatus'];
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
  createdAt: string;
  items: Array<{
    id: number;
    productId: number;
    name: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
  }>;
};

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  processing: 'bg-blue-100 text-blue-800',
  shipped: 'bg-purple-100 text-purple-800',
  delivered: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
};

const paymentStatusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  completed: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
};

export default function OrdersPage() {
  const params = useSearchParams();
  const nextStepsOrder = params.get('orderNumber');
  const showNextSteps = params.get('nextSteps') === '1';
  const [orderNumber, setOrderNumber] = useState('');
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedOrderNumber, setSelectedOrderNumber] = useState<string | null>(null);
  const queryOrderNumber = orderNumber.trim();
  const { data: meData, isLoading: meLoading } = useQuery({
    queryKey: ['customer-me'],
    queryFn: async () => {
      const response = await fetch('/api/customer/me', { credentials: 'include' });
      if (!response.ok) return null;
      return (await response.json()) as { user: { id: string; name: string; email: string } };
    },
    retry: false,
  });
  const isLoggedIn = Boolean(meData?.user);
  const ordersQuery = useQuery({
    queryKey: ['me-orders'],
    enabled: isLoggedIn,
    queryFn: async () => {
      const response = await fetch('/api/me/orders', { credentials: 'include' });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error || `Failed to fetch orders (${response.status})`);
      }
      return payload as PublicOrder[];
    },
    refetchInterval: isLoggedIn ? 10000 : false,
  });
  const detailsQuery = useQuery({
    queryKey: ['me-order', selectedOrderNumber],
    enabled: detailsOpen && !!selectedOrderNumber && isLoggedIn,
    queryFn: async () => {
      const response = await fetch(
        `/api/me/orders/${encodeURIComponent(String(selectedOrderNumber))}`,
        { credentials: 'include' }
      );
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error || `Failed to fetch order (${response.status})`);
      }
      return payload as PublicOrderDetails;
    },
  });
  const filteredOrders = useMemo(() => {
    const orders = ordersQuery.data || [];
    const q = queryOrderNumber.trim().toLowerCase();
    if (!q) return orders;
    return orders.filter((o) => o.orderNumber.toLowerCase().includes(q));
  }, [ordersQuery.data, queryOrderNumber]);
  const openDetails = (orderNo: string) => {
    setSelectedOrderNumber(orderNo);
    setDetailsOpen(true);
  };
  return (
    <Layout>
      <div className="container mx-auto px-4 py-10">
        <div className="max-w-4xl mx-auto space-y-6">
          {showNextSteps ? (
            <Card>
              <CardHeader>
                <CardTitle className="font-display">Order placed successfully</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {nextStepsOrder ? (
                  <p className="text-sm">
                    Your order number is <span className="font-semibold">{nextStepsOrder}</span>.
                  </p>
                ) : null}
                <p className="text-sm text-muted-foreground">
                  What happens next:
                </p>
                <ol className="list-decimal list-inside text-sm text-muted-foreground space-y-1">
                  <li>We confirm your order and prepare it for dispatch.</li>
                  <li>If you selected mobile money, you will receive a payment prompt.</li>
                  <li>We update the status here as it moves to processing, shipped, and delivered.</li>
                </ol>
              </CardContent>
            </Card>
          ) : null}
          <Card>
            <CardHeader>
              <CardTitle className="font-display">My Orders</CardTitle>
            </CardHeader>
            <CardContent>
              {meLoading ? (
                <p className="text-sm text-muted-foreground">Checking login…</p>
              ) : !isLoggedIn ? (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Please sign in to view your orders.
                  </p>
                  <Button asChild className="btn-primary">
                    <Link href="/login?return=/orders">Sign in</Link>
                  </Button>
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="orders-number">Filter by Order Number</Label>
                    <Input
                      id="orders-number"
                      value={orderNumber}
                      onChange={(e) => setOrderNumber(e.target.value)}
                      placeholder="ORD-000123"
                    />
                  </div>
                  <div className="flex items-end">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => ordersQuery.refetch()}
                      disabled={ordersQuery.isFetching}
                      className="w-full"
                    >
                      {ordersQuery.isFetching ? 'Refreshing…' : 'Refresh'}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
          <Dialog
            open={detailsOpen}
            onOpenChange={(open) => {
              setDetailsOpen(open);
              if (!open) setSelectedOrderNumber(null);
            }}
          >
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  Order {detailsQuery.data?.orderNumber ? detailsQuery.data.orderNumber : 'Details'}
                </DialogTitle>
                <DialogDescription>
                  Status updates here will match what admin sets.
                </DialogDescription>
              </DialogHeader>
              {detailsQuery.isLoading ? (
                <p className="text-sm text-muted-foreground">Loading…</p>
              ) : detailsQuery.error ? (
                <p className="text-sm text-destructive">
                  {(detailsQuery.error as any)?.message || 'Failed to load order'}
                </p>
              ) : detailsQuery.data ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <p className="text-sm text-muted-foreground">Status</p>
                      <Badge className={`${statusColors[detailsQuery.data.status]} border-0 capitalize mt-1`}>
                        {detailsQuery.data.status}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Payment</p>
                      <div className="mt-1">
                        <p className="text-sm">{detailsQuery.data.paymentMethod}</p>
                        <Badge className={`${paymentStatusColors[detailsQuery.data.paymentStatus]} border-0 text-xs mt-1 capitalize`}>
                          {detailsQuery.data.paymentStatus}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Items</p>
                    <div className="rounded-lg border overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Product</TableHead>
                            <TableHead className="w-20">Qty</TableHead>
                            <TableHead className="w-28">Total</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {detailsQuery.data.items.map((it) => (
                            <TableRow key={it.id}>
                              <TableCell className="font-medium">{it.name}</TableCell>
                              <TableCell>{it.quantity}</TableCell>
                              <TableCell>{formatPrice(it.lineTotal)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <p className="text-sm text-muted-foreground">Subtotal</p>
                      <p className="font-medium">{formatPrice(detailsQuery.data.subtotal)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Shipping</p>
                      <p className="font-medium">{formatPrice(detailsQuery.data.shipping)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Tax</p>
                      <p className="font-medium">{formatPrice(detailsQuery.data.tax)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Total</p>
                      <p className="font-medium">{formatPrice(detailsQuery.data.total)}</p>
                    </div>
                  </div>
                </div>
              ) : null}
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDetailsOpen(false)}>
                  Close
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </Layout>
  );
}
