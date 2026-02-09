import { useState } from 'react';
import { Search, Eye, MoreHorizontal } from 'lucide-react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { formatPrice } from '@/data/products';
import { toast } from 'sonner';

interface Order {
  id: string;
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

const initialOrders: Order[] = [
  {
    id: 'ORD-001',
    customer: 'Sarah Mukasa',
    email: 'sarah@example.com',
    phone: '0772 123 456',
    items: 3,
    total: 450000,
    status: 'delivered',
    paymentMethod: 'MTN MoMo',
    paymentStatus: 'completed',
    date: '2024-03-15',
  },
  {
    id: 'ORD-002',
    customer: 'John Kato',
    email: 'john@example.com',
    phone: '0752 234 567',
    items: 2,
    total: 289000,
    status: 'shipped',
    paymentMethod: 'MTN MoMo',
    paymentStatus: 'completed',
    date: '2024-03-15',
  },
  {
    id: 'ORD-003',
    customer: 'Grace Nalwoga',
    email: 'grace@example.com',
    phone: '0702 345 678',
    items: 1,
    total: 175000,
    status: 'processing',
    paymentMethod: 'Airtel Money',
    paymentStatus: 'completed',
    date: '2024-03-14',
  },
  {
    id: 'ORD-004',
    customer: 'Peter Ssemakula',
    email: 'peter@example.com',
    phone: '0782 456 789',
    items: 4,
    total: 520000,
    status: 'pending',
    paymentMethod: 'MTN MoMo',
    paymentStatus: 'pending',
    date: '2024-03-14',
  },
  {
    id: 'ORD-005',
    customer: 'Mary Nambi',
    email: 'mary@example.com',
    phone: '0712 567 890',
    items: 1,
    total: 95000,
    status: 'delivered',
    paymentMethod: 'Airtel Money',
    paymentStatus: 'completed',
    date: '2024-03-13',
  },
  {
    id: 'ORD-006',
    customer: 'James Okello',
    email: 'james@example.com',
    phone: '0772 678 901',
    items: 2,
    total: 340000,
    status: 'cancelled',
    paymentMethod: 'MTN MoMo',
    paymentStatus: 'failed',
    date: '2024-03-12',
  },
];

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
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.email.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const updateOrderStatus = (orderId: string, newStatus: Order['status']) => {
    setOrders(
      orders.map((order) =>
        order.id === orderId ? { ...order, status: newStatus } : order
      )
    );
    toast.success(`Order ${orderId} status updated to ${newStatus}`);
  };

  return (
    <AdminLayout title="Orders">
      <div className="space-y-6">
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
              {filteredOrders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-medium">{order.id}</TableCell>
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
                        updateOrderStatus(order.id, value as Order['status'])
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
                        <DropdownMenuItem>
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </AdminLayout>
  );
}
