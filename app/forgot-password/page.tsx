"use client";

import { useState } from 'react';
import Link from 'next/link';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resetUrl, setResetUrl] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setResetUrl(null);
    try {
      const response = await fetch('/api/customer/reset-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error || `Request failed (${response.status})`);
      }
      if (payload?.resetUrl) {
        setResetUrl(String(payload.resetUrl));
      }
      toast.success('If the email exists, a reset link will be sent.');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to request reset');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-md mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>Reset Password</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={submit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="reset-email">Email Address</Label>
                  <Input
                    id="reset-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                  />
                </div>
                <Button type="submit" className="w-full btn-primary" disabled={isSubmitting}>
                  {isSubmitting ? 'Sending…' : 'Send Reset Link'}
                </Button>
              </form>
              {resetUrl ? (
                <div className="mt-4 rounded-lg border p-3 text-sm">
                  <p className="text-muted-foreground">Dev link (no email yet):</p>
                  <Link href={resetUrl} className="text-primary break-all">
                    {resetUrl}
                  </Link>
                </div>
              ) : null}
              <p className="text-sm text-muted-foreground mt-4">
                Remembered your password?{' '}
                <Link href="/login" className="text-primary hover:underline">
                  Sign in
                </Link>
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
