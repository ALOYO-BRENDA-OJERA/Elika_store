"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Mail, Lock, Eye, EyeOff, ArrowRight, User } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
// ...existing code...
// Removed server-only imports. Use client-side logic or rely on API for authentication state.

const LoginPage = () => {
  const router = useRouter();
  const params = useSearchParams();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [alreadyLoggedIn, setAlreadyLoggedIn] = useState(false);
  const [loggedInType, setLoggedInType] = useState('');

  const returnTo = params.get('return') || '/orders';
  const fromCheckout = returnTo === '/checkout';

  // Removed useEffect that checks login state using server-only functions.
  // If you need to check login state, use a client-side API call or context.

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (alreadyLoggedIn) {
      toast.error(`You are already logged in as ${loggedInType}. Please logout first to login again.`);
      return;
    }
    setIsLoading(true);
    try {
      let response;
      let endpoint;
      let payload;
      if (username === 'admin') {
        endpoint = '/api/admin/login';
        response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ username, password }),
        });
        payload = await response.json().catch(() => null);
        if (!response.ok) {
          if (payload?.error === 'Invalid credentials') {
            toast.error('Admin credentials are incorrect. Please check your username and password.');
          } else {
            toast.error(payload?.error || 'Admin login failed.');
          }
          return;
        }
        toast.success('Admin login successful!');
        router.replace(`/${process.env.NEXT_PUBLIC_ADMIN_PATH || 'admin-1deec6581595'}`);
      } else {
        endpoint = '/api/customer/login';
        response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ email, password }),
        });
        payload = await response.json().catch(() => null);
        if (!response.ok) {
          if (payload?.error === 'Invalid credentials') {
            toast.error('Customer credentials are incorrect. Please check your email and password.');
          } else {
            toast.error(payload?.error || 'Customer login failed.');
          }
          return;
        }
        toast.success('Login successful!');
        router.replace(returnTo);
      }
    } catch (err: any) {
      toast.error('An unexpected error occurred during login. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-md mx-auto">
          <div className="text-center mb-8">
            <h1 className="font-display text-3xl font-bold mb-2">Welcome Back</h1>
            <p className="text-muted-foreground">
              Sign in to your account to continue shopping
            </p>
            {fromCheckout ? (
              <p className="mt-3 text-sm text-muted-foreground">
                You need to sign in before placing an order.
              </p>
            ) : null}
          </div>
          <div className="bg-card rounded-xl p-8 shadow-sm">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Admin Username</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="username"
                    type="text"
                    placeholder="Enter admin username (optional)"
                    className="pl-10"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    className="pl-10"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required={username !== 'admin'}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <Link
                    href={`/forgot-password?return=${encodeURIComponent(returnTo)}`}
                    className="text-sm text-primary hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    className="pl-10 pr-10"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="remember" />
                <Label htmlFor="remember" className="text-sm cursor-pointer">
                  Remember me
                </Label>
              </div>
              <Button
                type="submit"
                size="lg"
                className="w-full btn-primary gap-2"
                disabled={isLoading}
              >
                {isLoading ? 'Signing in...' : 'Sign In'}
                <ArrowRight className="h-4 w-4" />
              </Button>
              <p className="text-center text-sm text-muted-foreground">
                Don't have an account?{' '}
                <Link
                  href={`/signup?return=${encodeURIComponent(returnTo)}`}
                  className="text-primary font-medium hover:underline"
                >
                  Create account
                </Link>
              </p>
            </form>
            <div className="relative my-6">
              <Separator />
              <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-2 text-xs text-muted-foreground">
                or
              </span>
            </div>
          </div>
          <p className="text-center text-sm text-muted-foreground mt-6">
            Admin?{' '}
          </p>
        </div>
      </div>
    </Layout>
  );
};

