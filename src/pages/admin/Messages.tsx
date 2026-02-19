"use client";

import { useMemo, useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

const statusColors: Record<string, string> = {
  new: 'bg-yellow-100 text-yellow-800',
  completed: 'bg-green-100 text-green-800',
};

type ContactMessage = {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  subject: string | null;
  message: string;
  status: 'new' | 'completed';
  created_at: string;
};

export default function AdminMessages() {
  const queryClient = useQueryClient();
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selected, setSelected] = useState<ContactMessage | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'new' | 'completed'>('all');

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['admin-contacts'],
    queryFn: async () => {
      const response = await fetch('/api/contact', { credentials: 'include' });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error || `Failed to fetch messages (${response.status})`);
      }
      return payload as ContactMessage[];
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: ContactMessage['status'] }) => {
      const response = await fetch(`/api/contact/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error || `Failed to update (${response.status})`);
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin-contacts'] });
    },
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return messages.filter((m) => {
      if (statusFilter !== 'all' && m.status !== statusFilter) return false;
      if (!q) return true;
      return [m.name, m.email, m.subject, m.message]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q));
    });
  }, [messages, search, statusFilter]);

  const counts = useMemo(() => {
    return messages.reduce(
      (acc, m) => {
        acc.total += 1;
        if (m.status === 'new') acc.new += 1;
        if (m.status === 'completed') acc.completed += 1;
        return acc;
      },
      { total: 0, new: 0, completed: 0 }
    );
  }, [messages]);

  const openDetails = (message: ContactMessage) => {
    setSelected(message);
    setDetailsOpen(true);
  };

  const onStatusChange = async (message: ContactMessage, status: ContactMessage['status']) => {
    try {
      await updateStatus.mutateAsync({ id: message.id, status });
      toast.success('Message status updated');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update status');
    }
  };

  return (
    <AdminLayout title="Complaints">
      <div className="space-y-6">
        <div className="bg-card rounded-xl border shadow-sm p-4 space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <Badge className="border-0 bg-secondary text-foreground">All {counts.total}</Badge>
            <Badge className={`${statusColors.new} border-0`}>New {counts.new}</Badge>
            <Badge className={`${statusColors.completed} border-0`}>Completed {counts.completed}</Badge>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="md:col-span-2">
              <Label htmlFor="message-search">Search</Label>
              <Input
                id="message-search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, email, subject..."
                className="mt-2"
              />
            </div>
            <div>
              <Label htmlFor="message-status">Status</Label>
              <Select
                value={statusFilter}
                onValueChange={(value) => setStatusFilter(value as 'all' | 'new' | 'completed')}
              >
                <SelectTrigger id="message-status" className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <Dialog
          open={detailsOpen}
          onOpenChange={(open) => {
            setDetailsOpen(open);
            if (!open) setSelected(null);
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{selected?.subject || 'Message Details'}</DialogTitle>
              <DialogDescription>
                {selected?.name} · {selected?.email}
              </DialogDescription>
            </DialogHeader>

            {selected ? (
              <div className="space-y-4">
                <div className="text-sm text-muted-foreground">
                  {String(selected.created_at).slice(0, 10)}
                </div>
                <p className="whitespace-pre-line text-sm">{selected.message}</p>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Status</p>
                  <Select
                    value={selected.status}
                    onValueChange={(value) => {
                      onStatusChange(selected, value as ContactMessage['status']);
                      setSelected({ ...selected, status: value as ContactMessage['status'] });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new">New</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
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

        <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Sender</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="w-32"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                    Loading messages…
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                    No messages yet.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((msg) => (
                  <TableRow key={msg.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{msg.name}</p>
                        <p className="text-xs text-muted-foreground">{msg.email}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {msg.subject || 'No subject'}
                    </TableCell>
                    <TableCell>
                      <Badge className={`${statusColors[msg.status]} border-0 capitalize`}>
                        {msg.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {String(msg.created_at).slice(0, 10)}
                    </TableCell>
                    <TableCell>
                      <Button variant="outline" size="sm" onClick={() => openDetails(msg)}>
                        View
                      </Button>
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
