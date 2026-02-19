"use client";

import { useMemo, useState } from 'react';
import { Search, Eye, MoreHorizontal } from 'lucide-react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { formatPrice } from '@/data/products';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

interface Order {
  id: number;
  orderNumber: string;
  customer: string;
  email: string;
  phone: string;
  items: number;
  total: number;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  paymentMethod: string;
  paymentStatus: 'pending' | 'completed' | 'failed';
  date: string;
}

type OrderDetails = {
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
  status: Order['status'];
  paymentMethod: string;
  paymentStatus: Order['paymentStatus'];
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

export default function AdminOrders() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);

  const openDetails = (orderId: number) => {
    setSelectedOrderId(orderId);
    setDetailsOpen(true);
  };

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['admin-orders'],
    queryFn: async () => {
      const response = await fetch('/api/orders', { credentials: 'include' });
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error || `Failed to fetch orders (${response.status})`);
      }
      return (await response.json()) as Order[];
    },
  });

  const { data: orderDetails, isLoading: isDetailsLoading } = useQuery({
    queryKey: ['admin-order', selectedOrderId],
    enabled: detailsOpen && !!selectedOrderId,
    queryFn: async () => {
      const response = await fetch(`/api/orders/${selectedOrderId}`, {
        credentials: 'include',
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error || `Failed to fetch order (${response.status})`);
      }
      return (await response.json()) as OrderDetails;
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: number; status: Order['status'] }) => {
      const response = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error || `Failed to update status (${response.status})`);
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      if (selectedOrderId) {
        await queryClient.invalidateQueries({ queryKey: ['admin-order', selectedOrderId] });
      }
    },
  });

  const filteredOrders = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return orders.filter((order) => {
      const matchesSearch =
        !q ||
        order.orderNumber.toLowerCase().includes(q) ||
        order.customer.toLowerCase().includes(q) ||
        order.email.toLowerCase().includes(q);

      const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [orders, searchQuery, statusFilter]);

  const updateOrderStatus = async (order: Order, newStatus: Order['status']) => {
    try {
      await updateStatus.mutateAsync({ orderId: order.id, status: newStatus });
      toast.success(`Order ${order.orderNumber} status updated to ${newStatus}`);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update order status');
    }
  };

  const exportToExcel = () => {
    const rows = filteredOrders.map((order) => ({
      'Order Number': order.orderNumber,
      Customer: order.customer,
      Email: order.email,
      Phone: order.phone,
      Items: order.items,
      Total: order.total,
      Status: order.status,
      'Payment Method': order.paymentMethod,
      'Payment Status': order.paymentStatus,
      Date: order.date,
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Orders');

    const fileName = `orders-${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  return (
    <AdminLayout title="Orders">
      <div className="space-y-6">
        <Dialog
          open={detailsOpen}
          onOpenChange={(open) => {
            setDetailsOpen(open);
            if (!open) setSelectedOrderId(null);
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                Order {orderDetails?.orderNumber ? orderDetails.orderNumber : 'Details'}
              </DialogTitle>
              <DialogDescription>
                Customer, payment, and status information.
              </DialogDescription>
            </DialogHeader>

            {isDetailsLoading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : orderDetails ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <p className="text-sm text-muted-foreground">Customer</p>
                    <p className="font-medium">{orderDetails.customer.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Date</p>
                    <p className="font-medium">
                      {String(orderDetails.createdAt).slice(0, 10)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Phone</p>
                    <p className="font-medium">{orderDetails.customer.phone}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-medium">{orderDetails.customer.email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Items</p>
                    <p className="font-medium">{orderDetails.items.length}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total</p>
                    <p className="font-medium">{formatPrice(orderDetails.total)}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <p className="text-sm text-muted-foreground">Order Status</p>
                    <Badge className={`${statusColors[orderDetails.status]} border-0 capitalize mt-1`}>
                      {orderDetails.status}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Payment</p>
                    <div className="mt-1">
                      <p className="text-sm">{orderDetails.paymentMethod}</p>
                      <Badge
                        className={`${paymentStatusColors[orderDetails.paymentStatus]} border-0 text-xs mt-1 capitalize`}
                      >
                        {orderDetails.paymentStatus}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No order selected.</p>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDetailsOpen(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search orders..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="processing">Processing</SelectItem>
              <SelectItem value="shipped">Shipped</SelectItem>
              <SelectItem value="delivered">Delivered</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          <Button
            type="button"
            variant="outline"
            onClick={exportToExcel}
            disabled={filteredOrders.length === 0}
            className="sm:ml-auto"
          >
            Export to Excel
          </Button>
        </div>

        {/* Orders Table */}
        <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order ID</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
                    Loading orders…
                  </TableCell>
                </TableRow>
              ) : filteredOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
                    No orders yet.
                  </TableCell>
                </TableRow>
              ) : (
                filteredOrders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-medium">{order.orderNumber}</TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{order.customer}</p>
                      <p className="text-sm text-muted-foreground">
                        {order.phone}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>{order.items} items</TableCell>
                  <TableCell className="font-medium">
                    {formatPrice(order.total)}
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="text-sm">{order.paymentMethod}</p>
                      <Badge
                        className={`${paymentStatusColors[order.paymentStatus]} border-0 text-xs mt-1`}
                      >
                        {order.paymentStatus}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={order.status}
                      onValueChange={(value) =>
                        updateOrderStatus(order, value as Order['status'])
                      }
                    >
                      <SelectTrigger className="w-[130px] h-8">
                        <Badge
                          className={`${statusColors[order.status]} border-0 capitalize`}
                        >
                          {order.status}
                        </Badge>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="processing">Processing</SelectItem>
                        <SelectItem value="shipped">Shipped</SelectItem>
                        <SelectItem value="delivered">Delivered</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {order.date}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onSelect={(e) => {
                            e.preventDefault();
                            openDetails(order.id);
                          }}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </AdminLayout>
  );
}
