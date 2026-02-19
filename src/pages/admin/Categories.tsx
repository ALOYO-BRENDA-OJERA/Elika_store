"use client";

import { useState } from 'react';
import { Plus, Search, Edit, Trash2, MoreHorizontal } from 'lucide-react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';

interface Category {
  id: string;
  name: string;
  slug: string;
  image: string | null;
  created_at: string;
  updated_at: string;
}

interface Subsection {
  id: number;
  category_id: number;
  name: string;
  slug: string;
  created_at: string;
}

const slugify = (value: string) => value.trim().toLowerCase().replace(/\s+/g, '-');

export default function AdminCategories() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [subsectionsOpen, setSubsectionsOpen] = useState(false);
  const [subsectionCategory, setSubsectionCategory] = useState<Category | null>(null);
  const [newSubsectionName, setNewSubsectionName] = useState('');
  const [editingSubsectionId, setEditingSubsectionId] = useState<number | null>(null);
  const [editingSubsectionName, setEditingSubsectionName] = useState('');
  const queryClient = useQueryClient();

  // Fetch categories from database
  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['admin-categories'],
    queryFn: async () => {
      const response = await fetch('/api/categories');
      if (!response.ok) throw new Error('Failed to fetch categories');
      return response.json() as Promise<Category[]>;
    },
  });

  const subsectionsQuery = useQuery({
    queryKey: ['admin-category-subsections', subsectionCategory?.id],
    enabled: subsectionsOpen && !!subsectionCategory?.id,
    queryFn: async () => {
      const response = await fetch(
        `/api/categories/${subsectionCategory?.id}/subsections`,
        { credentials: 'include' }
      );
      if (!response.ok) throw new Error('Failed to fetch subsections');
      return response.json() as Promise<Subsection[]>;
    },
  });

  // Add category mutation
  const addCategoryMutation = useMutation({
    mutationFn: async (newCategory: { name: string; slug: string; image?: string }) => {
      const response = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCategory),
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to add category');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
      setIsAddDialogOpen(false);
      toast.success('Category added successfully');
    },
    onError: (error: any) => {
      toast.error('Failed to add category: ' + error.message);
    },
  });

  // Update category mutation
  const updateCategoryMutation = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; name: string; slug: string }) => {
      const response = await fetch(`/api/categories/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!response.ok) throw new Error('Failed to update category');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
      setEditingCategory(null);
      toast.success('Category updated successfully');
    },
    onError: (error: any) => {
      toast.error('Failed to update category: ' + error.message);
    },
  });

  // Delete category mutation
  const deleteCategoryMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/categories/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete category');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
      toast.success('Category deleted successfully');
    },
    onError: (error: any) => {
      toast.error('Failed to delete category: ' + error.message);
    },
  });

  const addSubsectionMutation = useMutation({
    mutationFn: async ({ categoryId, name }: { categoryId: string; name: string }) => {
      const response = await fetch(`/api/categories/${categoryId}/subsections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name, slug: slugify(name) }),
      });
      if (!response.ok) throw new Error('Failed to add subsection');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['admin-category-subsections', subsectionCategory?.id],
      });
      setNewSubsectionName('');
      toast.success('Subsection added');
    },
    onError: (error: any) => {
      toast.error('Failed to add subsection: ' + error.message);
    },
  });

  const updateSubsectionMutation = useMutation({
    mutationFn: async ({ id, name }: { id: number; name: string }) => {
      const response = await fetch(`/api/subsections/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name, slug: slugify(name) }),
      });
      if (!response.ok) throw new Error('Failed to update subsection');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['admin-category-subsections', subsectionCategory?.id],
      });
      setEditingSubsectionId(null);
      setEditingSubsectionName('');
      toast.success('Subsection updated');
    },
    onError: (error: any) => {
      toast.error('Failed to update subsection: ' + error.message);
    },
  });

  const deleteSubsectionMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/subsections/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to delete subsection');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['admin-category-subsections', subsectionCategory?.id],
      });
      toast.success('Subsection deleted');
    },
    onError: (error: any) => {
      toast.error('Failed to delete subsection: ' + error.message);
    },
  });

  const filteredCategories = categories.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddCategory = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;
    const slug = slugify(name);
    
    addCategoryMutation.mutate({ name, slug });
  };

  const handleEditCategory = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingCategory) return;
    
    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;
    const slug = slugify(name);
    
    updateCategoryMutation.mutate({ id: editingCategory.id, name, slug });
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this category?')) {
      deleteCategoryMutation.mutate(id);
    }
  };

  const openSubsections = (category: Category) => {
    setSubsectionCategory(category);
    setSubsectionsOpen(true);
    setNewSubsectionName('');
    setEditingSubsectionId(null);
    setEditingSubsectionName('');
  };

  const closeSubsections = () => {
    setSubsectionsOpen(false);
    setSubsectionCategory(null);
    setNewSubsectionName('');
    setEditingSubsectionId(null);
    setEditingSubsectionName('');
  };

  const handleAddSubsection = () => {
    if (!subsectionCategory) return;
    const name = newSubsectionName.trim();
    if (!name) {
      toast.error('Subsection name is required');
      return;
    }
    addSubsectionMutation.mutate({ categoryId: subsectionCategory.id, name });
  };

  const startEditSubsection = (subsection: Subsection) => {
    setEditingSubsectionId(subsection.id);
    setEditingSubsectionName(subsection.name);
  };

  const handleUpdateSubsection = () => {
    const name = editingSubsectionName.trim();
    if (!editingSubsectionId) return;
    if (!name) {
      toast.error('Subsection name is required');
      return;
    }
    updateSubsectionMutation.mutate({ id: editingSubsectionId, name });
  };

  return (
    <AdminLayout title="Categories">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search categories..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="btn-primary gap-2">
                <Plus className="h-4 w-4" />
                Add Category
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="font-display">Add New Category</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAddCategory} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Category Name</Label>
                  <Input id="name" name="name" required />
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
                    disabled={addCategoryMutation.isPending}
                  >
                    {addCategoryMutation.isPending ? 'Adding...' : 'Add Category'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Edit Dialog */}
        <Dialog open={!!editingCategory} onOpenChange={(open) => !open && setEditingCategory(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="font-display">Edit Category</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleEditCategory} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Category Name</Label>
                <Input 
                  id="edit-name" 
                  name="name" 
                  defaultValue={editingCategory?.name}
                  required 
                />
              </div>
              <div className="flex gap-3 justify-end pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditingCategory(null)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  className="btn-primary"
                  disabled={updateCategoryMutation.isPending}
                >
                  {updateCategoryMutation.isPending ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Subsections Dialog */}
        <Dialog open={subsectionsOpen} onOpenChange={(open) => !open && closeSubsections()}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="font-display">
                Manage Subsections
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div className="text-sm text-muted-foreground">
                {subsectionCategory ? subsectionCategory.name : 'Category'}
              </div>
              <div className="flex gap-2">
                <Input
                  value={newSubsectionName}
                  onChange={(e) => setNewSubsectionName(e.target.value)}
                  placeholder="New subsection name"
                />
                <Button
                  type="button"
                  onClick={handleAddSubsection}
                  disabled={addSubsectionMutation.isPending}
                >
                  {addSubsectionMutation.isPending ? 'Adding...' : 'Add'}
                </Button>
              </div>

              {subsectionsQuery.isLoading ? (
                <div className="text-sm text-muted-foreground">Loading subsections...</div>
              ) : (subsectionsQuery.data || []).length === 0 ? (
                <div className="text-sm text-muted-foreground">No subsections yet.</div>
              ) : (
                <div className="space-y-2">
                  {(subsectionsQuery.data || []).map((subsection) => {
                    const isEditing = editingSubsectionId === subsection.id;
                    return (
                      <div key={subsection.id} className="flex flex-wrap items-center gap-2">
                        {isEditing ? (
                          <Input
                            value={editingSubsectionName}
                            onChange={(e) => setEditingSubsectionName(e.target.value)}
                            className="flex-1 min-w-[200px]"
                          />
                        ) : (
                          <div className="flex-1 min-w-[200px] text-sm">
                            {subsection.name}
                          </div>
                        )}
                        <div className="flex gap-2">
                          {isEditing ? (
                            <>
                              <Button
                                type="button"
                                size="sm"
                                onClick={handleUpdateSubsection}
                                disabled={updateSubsectionMutation.isPending}
                              >
                                {updateSubsectionMutation.isPending ? 'Saving...' : 'Save'}
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setEditingSubsectionId(null);
                                  setEditingSubsectionName('');
                                }}
                              >
                                Cancel
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => startEditSubsection(subsection)}
                              >
                                Edit
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="destructive"
                                onClick={() => deleteSubsectionMutation.mutate(subsection.id)}
                                disabled={deleteSubsectionMutation.isPending}
                              >
                                Delete
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Categories Table */}
        <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12"></TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-10 w-10 rounded-lg" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-8" /></TableCell>
                  </TableRow>
                ))
              ) : filteredCategories.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No categories found. Add your first category to get started.
                  </TableCell>
                </TableRow>
              ) : (
                filteredCategories.map((category) => (
                  <TableRow key={category.id}>
                    <TableCell>
                      <div className="w-10 h-10 rounded-lg bg-muted overflow-hidden">
                        <img
                          src={category.image || '/placeholder.svg'}
                          alt={category.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{category.name}</TableCell>
                    <TableCell className="text-muted-foreground">{category.slug}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(category.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setEditingCategory(category)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openSubsections(category)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Subsections
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => handleDelete(category.id)}
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
