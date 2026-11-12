'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '../hooks/useAuth';
import { loginSchema, authService } from '../services/authService';
import type { LoginInput } from '../services/authService';
import { Button } from '@/shared/components/Button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/shared/components/Card';
import { Input } from '@/shared/components/Input';
import { Store, ShieldAlert, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { GoogleButton } from './GoogleButton';
import { useConfirmStore } from '@/lib/store/confirmStore';

import { useSellerLayout } from '@/lib/hooks/useSellerLayout';

function formatAuthError(error: string | null): string | null {
  if (!error) return null;
  if (error === 'GoogleAuthFailed') return 'Google sign in failed. Please check your credentials or sign in with email.';
  if (error === 'OAuthSignin' || error === 'OAuthCallback') return 'Unable to complete Google authentication. Please try again.';
  if (error === 'OAuthAccountNotLinked') return 'An account already exists with this email address. Please sign in using your existing password.';
  if (error === 'Callback') return 'Authentication callback failed. Please try again.';
  return error;
}

export function LoginPage() {
  const { branding } = useSellerLayout();
  const { login, isLoggingIn } = useAuth();
  const searchParams = useSearchParams();
  const isExpired = searchParams?.get('expired') === 'true';
  const urlError = searchParams?.get('error');
  const [errorMsg, setErrorMsg] = useState<string | null>(
    isExpired ? 'Your session has expired. Please sign in again.' : formatAuthError(urlError)
  );

  const {
    register: formRegister,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  });

  const [logoError, setLogoError] = useState(false);
  const hasValidLogo = Boolean(!logoError && branding?.logo && branding.logo.trim() !== '');

  const onSubmit = async (data: LoginInput) => {
    setErrorMsg(null);
    try {
      await login(data);
    } catch (err: any) {
      setErrorMsg(authService.formatError(err));
    }
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center overflow-hidden bg-background text-foreground noise-bg py-12 px-4 sm:px-6 lg:px-8">
      {/* Background Floating Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-purple-600/10 blur-[120px] orb-1 pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-indigo-500/10 blur-[120px] orb-2 pointer-events-none" />
      <div className="absolute top-[40%] right-[30%] w-[300px] h-[300px] rounded-full bg-pink-500/5 blur-[100px] orb-3 pointer-events-none" />

      {/* Main card */}
      <div className="relative z-10 w-full max-w-[420px] animate-fade-up">
        {/* Portal Header */}
        <div className="flex flex-col items-center mb-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/[0.04] border border-white/10 mb-3 shadow-lg overflow-hidden shrink-0">
            {hasValidLogo ? (
              <img
                src={branding.logo}
                alt={branding.name || 'Marketplace'}
                className="h-full w-full object-contain p-1.5"
                onError={() => setLogoError(true)}
              />
            ) : (
              <Store className="h-6 w-6 text-purple-400" />
            )}
          </div>
          <h1 className="text-2xl font-extrabold text-white text-gradient">{branding?.name || 'Seller Portal'}</h1>
          <p className="text-xs text-white/40 mt-1 uppercase tracking-widest font-semibold">{branding?.tagline || 'Merchant Center'}</p>
        </div>

        <Card className="border border-white/10 shadow-2xl">
          <CardHeader className="space-y-1.5 pb-4">
            <CardTitle className="text-xl font-bold">Sign In</CardTitle>
            <CardDescription>Enter your email and password to access your dashboard</CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {errorMsg && (
              <div className="flex items-center gap-2 p-3.5 rounded-xl border border-red-500/20 bg-red-500/10 text-xs text-red-400 animate-in fade-in slide-in-from-top-1">
                <ShieldAlert className="h-4 w-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-white/60 ml-1">Email or Username</label>
                <Input
                  type="text"
                  placeholder="Email or Username"
                  autoComplete="username"
                  error={!!errors.identifier}
                  {...formRegister('identifier')}
                />
                {errors.identifier && (
                  <p className="text-[11px] text-red-400 ml-1 mt-0.5">{errors.identifier.message}</p>
                )}
              </div>

              <div className="space-y-1">
                <div className="flex justify-between items-center px-1">
                  <label className="text-xs font-semibold text-white/60">Password</label>
                  <Link
                    href="/forgot-password"
                    className="text-[11px] text-purple-400 hover:text-purple-300 font-medium transition-colors cursor-pointer"
                  >
                    Forgot Password?
                  </Link>
                </div>
                <Input
                  type="password"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  error={!!errors.password}
                  {...formRegister('password')}
                />
                {errors.password && (
                  <p className="text-[11px] text-red-400 ml-1 mt-0.5">{errors.password.message}</p>
                )}
              </div>

              <Button type="submit" className="w-full mt-2" isLoading={isLoggingIn}>
                <span>Sign In with Email</span>
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </form>

            <div className="relative flex items-center py-1.5">
              <div className="flex-grow border-t border-white/[0.08]" />
              <span className="mx-3 text-[10px] font-medium text-white/30 uppercase tracking-wider">or</span>
              <div className="flex-grow border-t border-white/[0.08]" />
            </div>

            <GoogleButton onError={(msg) => {
              useConfirmStore.getState().showAlert({
                title: 'Portal Restriction',
                message: msg,
                confirmText: 'Acknowledge',
              });
            }} />
          </CardContent>

          <CardFooter className="flex justify-center pt-2 pb-6 border-t border-white/5">
            <p className="text-xs text-white/45">
              Don't have a seller account?{' '}
              <Link href="/register" className="text-purple-400 hover:text-purple-300 font-semibold hover:underline">
                Create one now
              </Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
