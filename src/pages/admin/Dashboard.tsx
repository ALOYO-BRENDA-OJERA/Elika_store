import {
  TrendingUp,
  DollarSign,
  Package,
  FolderOpen,
  ArrowUpRight,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatPrice, products, categories } from '@/data/products';
import { useQuery } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/skeleton';

export default function AdminDashboard() {
  const adminBase = (import.meta.env.VITE_ADMIN_PATH as string | undefined) || 'admin';

  // Fetch dashboard stats
  const { data: statsData, isLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const response = await fetch('/api/stats', { credentials: 'include' });
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error || `Failed to fetch stats (${response.status})`);
      }
      return response.json();
    },
  });

  const productCount = statsData?.productCount || 0;
  const categoryCount = statsData?.categoryCount || 0;
  const totalValue = statsData?.totalValue || 0;
  const topProducts = statsData?.topProducts || [];
  const recentOrders = statsData?.recentOrders || [];
  const recentContacts = statsData?.recentContacts || [];

  const stats = [
    {
      title: 'Total Products',
      value: productCount.toString(),
      icon: Package,
      loading: isLoading,
    },
    {
      title: 'Categories',
      value: categoryCount.toString(),
      icon: FolderOpen,
      loading: isLoading,
    },
    {
      title: 'Inventory Value',
      value: formatPrice(totalValue),
      icon: DollarSign,
      loading: isLoading,
    },
  ];

  return (
    <AdminLayout title="Dashboard">
      <div className="space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {stats.map((stat) => (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <stat.icon className="h-4 w-4 text-primary" />
                </div>
              </CardHeader>
              <CardContent>
                {stat.loading ? (
                  <Skeleton className="h-8 w-24" />
                ) : (
                  <div className="text-2xl font-bold">{stat.value}</div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Top Products */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="font-display text-lg">Top Products</CardTitle>
              <Button variant="ghost" size="sm" className="gap-1" asChild>
                <Link to={`/${adminBase}/products`}>
                  View All <ArrowUpRight className="h-4 w-4" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <Skeleton className="w-6 h-6 rounded-full" />
                      <Skeleton className="h-4 flex-1" />
                      <Skeleton className="h-4 w-20" />
                    </div>
                  ))}
                </div>
              ) : topProducts.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No products yet. Add your first product to get started.
                </p>
              ) : (
                <div className="space-y-4">
                  {topProducts.map((product, index) => (
                    <div key={product.id} className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                        {index + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{product.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {product.review_count} reviews
                        </p>
                      </div>
                      <span className="text-sm font-medium">
                        {formatPrice(product.price)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="font-display text-lg">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button className="w-full justify-start gap-2" variant="outline" asChild>
                  <Link to={`/${adminBase}/products`}>
                    <Package className="h-4 w-4" />
                    Manage Products
                  </Link>
                </Button>
                <Button className="w-full justify-start gap-2" variant="outline" asChild>
                  <Link to={`/${adminBase}/categories`}>
                    <FolderOpen className="h-4 w-4" />
                    Manage Categories
                  </Link>
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="font-display text-lg">Get In Touch</CardTitle>
                <Button variant="ghost" size="sm" className="gap-1" asChild>
                  <Link to={`/${adminBase}/messages`}>View All</Link>
                </Button>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-4 flex-1" />
                      </div>
                    ))}
                  </div>
                ) : recentContacts.length === 0 ? (
                  <p className="text-muted-foreground text-sm">No messages yet.</p>
                ) : (
                  <div className="space-y-3">
                    {recentContacts.map((msg) => (
                      <div key={msg.id} className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{msg.name}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {msg.subject || 'No subject'}
                          </p>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {String(msg.date).slice(0, 10)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
