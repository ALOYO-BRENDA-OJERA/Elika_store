"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

type MeResponse = { user: { id: string; username: string; role: string } };

export function AdminGate({
  children,
  adminBase,
}: {
  children: React.ReactNode;
  adminBase: string;
}) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-me'],
    queryFn: async () => {
      const response = await fetch('/api/auth/me', { credentials: 'include' });
      if (!response.ok) {
        console.log('AdminGate: /api/auth/me failed', response.status);
        throw new Error(`Auth check failed (${response.status})`);
      }
      const json = (await response.json()) as MeResponse;
      console.log('AdminGate: /api/auth/me success', json);
      return json;
    },
    retry: false,
  });

  const isAdmin = data?.user?.role === 'admin';
  console.log('AdminGate: isLoading', isLoading, 'isAdmin', isAdmin, 'data', data);

  if (isLoading) {
    console.log('AdminGate: loading...');
    return null;
  }

  if (isAdmin) {
    console.log('AdminGate: Authenticated as admin, rendering children');
    return <>{children}</>;
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      console.log('AdminGate: Submitting login', { username });
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username, password }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        const serverMessage = payload?.error ? String(payload.error) : null;
        const hint =
          response.status === 401
            ? 'Invalid credentials (check ADMIN_SEED_USERNAME / ADMIN_SEED_PASSWORD in server/.env and ensure you ran npm run seed:admin)'
            : null;
        console.log('AdminGate: Login failed', { status: response.status, serverMessage, hint });
        throw new Error(
          serverMessage || hint || `Login failed (${response.status})`
        );
      }
      await queryClient.invalidateQueries({ queryKey: ['admin-me'] });
      console.log('AdminGate: Login successful, invalidated admin-me, redirecting with router.replace');
      router.replace(`/${adminBase}`);
    } catch (err: any) {
      console.log('AdminGate: Login error', err);
      setError(err?.message || 'Login failed (unknown error)');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Admin Login</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="admin-username">Username</Label>
              <Input
                id="admin-username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="admin-password">Password</Label>
              <div className="relative">
                <Input
                  id="admin-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                  className="pr-20"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 -translate-y-1/2"
                  onClick={() => setShowPassword((v) => !v)}
                >
                  {showPassword ? 'Hide' : 'Show'}
                </Button>
              </div>
            </div>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <Button type="submit" className="w-full btn-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Signing in…' : 'Sign In'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
