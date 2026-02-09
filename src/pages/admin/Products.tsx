import { useEffect, useMemo, useState } from 'react';
import { Plus, Search, Edit, Trash2, MoreHorizontal, Eye } from 'lucide-react';
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { formatPrice } from '@/data/products';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';

interface Product {
  id: number;
  name: string;
  description: string | null;
  price: number;
  original_price: number | null;
  category_id: number | null;
  category_name?: string | null;
  images: unknown;
  image_labels?: unknown;
  features?: unknown;
  in_stock: boolean | null;
  stock_count: number | null;
}

interface Category {
  id: number;
  name: string;
}

export default function AdminProducts() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [newProductCategoryId, setNewProductCategoryId] = useState('');
  const [editProductCategoryId, setEditProductCategoryId] = useState('');
  const [newProductFrontImage, setNewProductFrontImage] = useState<File | null>(null);
  const [newProductBackImage, setNewProductBackImage] = useState<File | null>(null);
  const [editProductFrontImage, setEditProductFrontImage] = useState<File | null>(null);
  const [editProductBackImage, setEditProductBackImage] = useState<File | null>(null);
  const [newProductFeaturesText, setNewProductFeaturesText] = useState('');
  const [editProductFeaturesText, setEditProductFeaturesText] = useState('');
  const queryClient = useQueryClient();

  const parseFeatures = (value: string) =>
    value
      .split(/\r?\n/g)
      .map((s) => s.trim())
      .filter(Boolean);

  useEffect(() => {
    if (isAddDialogOpen) {
      setNewProductCategoryId('');
      setNewProductFeaturesText('');
      setNewProductFrontImage(null);
      setNewProductBackImage(null);
    }
  }, [isAddDialogOpen]);

  useEffect(() => {
    if (!editingProduct) return;
    setEditProductCategoryId(
      editingProduct.category_id !== null && editingProduct.category_id !== undefined
        ? String(editingProduct.category_id)
        : ''
    );
    setEditProductFrontImage(null);
    setEditProductBackImage(null);

    const features = (editingProduct as any).features;
    if (Array.isArray(features)) {
      setEditProductFeaturesText(features.filter(Boolean).join('\n'));
    } else if (typeof features === 'string') {
      try {
        const parsed = JSON.parse(features);
        setEditProductFeaturesText(Array.isArray(parsed) ? parsed.filter(Boolean).join('\n') : '');
      } catch {
        setEditProductFeaturesText('');
      }
    } else {
      setEditProductFeaturesText('');
    }

    // Labels are fixed as Front/Back in this UX
  }, [editingProduct]);

  const existingEditImages = useMemo(() => {
    const value = (editingProduct as any)?.images;
    if (Array.isArray(value)) return value.filter((v) => typeof v === 'string') as string[];
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) return parsed.filter((v) => typeof v === 'string') as string[];
      } catch {
        // ignore
      }
    }
    return [] as string[];
  }, [editingProduct]);

  // Fetch products from database
  const { data: products = [], isLoading } = useQuery({
    queryKey: ['admin-products'],
    queryFn: async () => {
      const response = await fetch('/api/products');
      if (!response.ok) throw new Error('Failed to fetch products');
      return response.json() as Promise<Product[]>;
    },
  });

  // Fetch categories for dropdown
  const { data: categories = [] } = useQuery({
    queryKey: ['admin-categories-list'],
    queryFn: async () => {
      const response = await fetch('/api/categories');
      if (!response.ok) throw new Error('Failed to fetch categories');
      return response.json() as Promise<Category[]>;
    },
  });

  // Add product mutation
  const addProductMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await fetch('/api/products', { method: 'POST', body: formData });
      if (!response.ok) throw new Error('Failed to add product');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      queryClient.invalidateQueries({ queryKey: ['admin-product-count'] });
      setIsAddDialogOpen(false);
      toast.success('Product added successfully');
    },
    onError: (error: any) => {
      toast.error('Failed to add product: ' + error.message);
    },
  });

  // Update product mutation
  const updateProductMutation = useMutation({
    mutationFn: async ({ id, formData }: { id: number; formData: FormData }) => {
      const response = await fetch(`/api/products/${id}`, { method: 'PUT', body: formData });
      if (!response.ok) throw new Error('Failed to update product');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      setEditingProduct(null);
      toast.success('Product updated successfully');
    },
    onError: (error: any) => {
      toast.error('Failed to update product: ' + error.message);
    },
  });

  // Delete product mutation
  const deleteProductMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/products/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete product');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      queryClient.invalidateQueries({ queryKey: ['admin-product-count'] });
      toast.success('Product deleted successfully');
    },
    onError: (error: any) => {
      toast.error('Failed to delete product: ' + error.message);
    },
  });

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.category_name || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const normalizedProducts = useMemo(() => {
    return filteredProducts.map((p) => {
      let parsedImages: string[] | null = null;

      if (Array.isArray(p.images)) {
        parsedImages = p.images as string[];
      } else if (typeof p.images === 'string') {
        try {
          const parsed = JSON.parse(p.images);
          parsedImages = Array.isArray(parsed) ? parsed : null;
        } catch {
          parsedImages = null;
        }
      }

      return {
        ...p,
        images: parsedImages,
      };
    });
  }, [filteredProducts]);

  const handleAddProduct = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const formData = new FormData();
    const source = new FormData(e.currentTarget);
    formData.set('name', (source.get('name') as string) || '');
    formData.set('description', (source.get('description') as string) || '');
    formData.set('price', String(parseInt((source.get('price') as string) || '0') || 0));
    formData.set('stock_count', String(parseInt((source.get('stock') as string) || '0') || 0));
    formData.set('category_id', newProductCategoryId ? String(Number(newProductCategoryId)) : '');
    if (newProductFrontImage) formData.append('front_image', newProductFrontImage);
    if (newProductBackImage) formData.append('back_image', newProductBackImage);
    formData.set('features', JSON.stringify(parseFeatures(newProductFeaturesText)));
    formData.set('image_labels', JSON.stringify(['Front', 'Back']));

    addProductMutation.mutate(formData);
  };

  const handleEditProduct = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingProduct) return;

    const source = new FormData(e.currentTarget);
    const formData = new FormData();
    formData.set('name', (source.get('name') as string) || '');
    formData.set('description', (source.get('description') as string) || '');
    formData.set('price', String(parseInt((source.get('price') as string) || '0') || 0));
    formData.set('stock_count', String(parseInt((source.get('stock') as string) || '0') || 0));
    formData.set('category_id', editProductCategoryId ? String(Number(editProductCategoryId)) : '');
    if (editProductFrontImage) formData.append('front_image', editProductFrontImage);
    if (editProductBackImage) formData.append('back_image', editProductBackImage);
    formData.set('features', JSON.stringify(parseFeatures(editProductFeaturesText)));
    formData.set('image_labels', JSON.stringify(['Front', 'Back']));

    updateProductMutation.mutate({ id: editingProduct.id, formData });
  };

  const handleDelete = (productId: string) => {
    if (confirm('Are you sure you want to delete this product?')) {
      deleteProductMutation.mutate(productId);
    }
  };

  return (
    <AdminLayout title="Products">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="btn-primary gap-2">
                <Plus className="h-4 w-4" />
                Add Product
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="font-display">Add New Product</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAddProduct} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Product Name</Label>
                  <Input id="name" name="name" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea id="description" name="description" rows={3} required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="price">Price (UGX)</Label>
                    <Input id="price" name="price" type="number" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="stock">Stock</Label>
                    <Input id="stock" name="stock" type="number" defaultValue={0} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select value={newProductCategoryId} onValueChange={setNewProductCategoryId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={String(cat.id)}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Product Images</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="front-image">Front Image</Label>
                      <Input
                        id="front-image"
                        type="file"
                        accept="image/*"
                        required
                        onChange={(e) => setNewProductFrontImage(e.target.files?.[0] ?? null)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="back-image">Back Image</Label>
                      <Input
                        id="back-image"
                        type="file"
                        accept="image/*"
                        required
                        onChange={(e) => setNewProductBackImage(e.target.files?.[0] ?? null)}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="features">Product Features</Label>
                  <Textarea
                    id="features"
                    rows={4}
                    placeholder="One feature per line"
                    value={newProductFeaturesText}
                    onChange={(e) => setNewProductFeaturesText(e.target.value)}
                  />
                </div>

                <div className="flex gap-3 justify-end pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsAddDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    className="btn-primary"
                    disabled={addProductMutation.isPending}
                  >
                    {addProductMutation.isPending ? 'Adding...' : 'Add Product'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Edit Dialog */}
        <Dialog open={!!editingProduct} onOpenChange={(open) => !open && setEditingProduct(null)}>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-display">Edit Product</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleEditProduct} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Product Name</Label>
                <Input 
                  id="edit-name" 
                  name="name" 
                  defaultValue={editingProduct?.name}
                  required 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-description">Description</Label>
                <Textarea 
                  id="edit-description" 
                  name="description" 
                  rows={3} 
                  defaultValue={editingProduct?.description || ''}
                  required 
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-price">Price (UGX)</Label>
                  <Input 
                    id="edit-price" 
                    name="price" 
                    type="number" 
                    defaultValue={editingProduct?.price}
                    required 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-stock">Stock</Label>
                  <Input 
                    id="edit-stock" 
                    name="stock" 
                    type="number" 
                    defaultValue={editingProduct?.stock_count || 0}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-category">Category</Label>
                <Select value={editProductCategoryId} onValueChange={setEditProductCategoryId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={String(cat.id)}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-images">Product Images</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-front-image">Front Image</Label>
                    <Input
                      id="edit-front-image"
                      type="file"
                      accept="image/*"
                      onChange={(e) => setEditProductFrontImage(e.target.files?.[0] ?? null)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-back-image">Back Image</Label>
                    <Input
                      id="edit-back-image"
                      type="file"
                      accept="image/*"
                      onChange={(e) => setEditProductBackImage(e.target.files?.[0] ?? null)}
                    />
                  </div>
                </div>
              </div>

              {existingEditImages.length > 0 && (
                <div className="space-y-2">
                  <Label>Current Images</Label>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground truncate">Front: {existingEditImages[0] || ''}</p>
                    <p className="text-sm text-muted-foreground truncate">Back: {existingEditImages[1] || ''}</p>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="edit-features">Product Features</Label>
                <Textarea
                  id="edit-features"
                  rows={4}
                  placeholder="One feature per line"
                  value={editProductFeaturesText}
                  onChange={(e) => setEditProductFeaturesText(e.target.value)}
                />
              </div>

              <div className="flex gap-3 justify-end pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditingProduct(null)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  className="btn-primary"
                  disabled={updateProductMutation.isPending}
                >
                  {updateProductMutation.isPending ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Products Table */}
        <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12"></TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-10 w-10 rounded-lg" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-8" /></TableCell>
                  </TableRow>
                ))
              ) : filteredProducts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No products found. Add your first product to get started.
                  </TableCell>
                </TableRow>
              ) : (
                normalizedProducts.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell>
                      <div className="w-10 h-10 rounded-lg bg-muted overflow-hidden">
                        <img
                          src={(product.images as string[] | null)?.[0] || '/placeholder.svg'}
                          alt={product.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{product.name}</p>
                        <p className="text-sm text-muted-foreground line-clamp-1">
                          {product.description}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {product.category_name || 'Uncategorized'}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatPrice(product.price)}
                    </TableCell>
                    <TableCell>{product.stock_count || 0}</TableCell>
                    <TableCell>
                      <Badge
                        className={
                          product.in_stock
                            ? 'bg-green-100 text-green-800 border-0'
                            : 'bg-red-100 text-red-800 border-0'
                        }
                      >
                        {product.in_stock ? 'In Stock' : 'Out of Stock'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setEditingProduct(product)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => handleDelete(product.id)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
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
