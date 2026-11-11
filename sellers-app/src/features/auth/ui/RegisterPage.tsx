'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '../hooks/useAuth';
import { registerSchema, authService } from '../services/authService';
import type { RegisterInput } from '../services/authService';
import { Button } from '@/shared/components/Button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/shared/components/Card';
import { Input } from '@/shared/components/Input';
import { Store, ShieldAlert, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { GoogleButton } from './GoogleButton';
import { useConfirmStore } from '@/lib/store/confirmStore';

import { useSellerLayout } from '@/lib/hooks/useSellerLayout';

export function RegisterPage() {
  const { branding } = useSellerLayout();
  const { register: registerSeller, isRegistering } = useAuth();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const {
    register: formRegister,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
  });

  const [logoError, setLogoError] = useState(false);
  const hasValidLogo = Boolean(!logoError && branding?.logo && branding.logo.trim() !== '');

  const onSubmit = async (data: RegisterInput) => {
    setErrorMsg(null);
    try {
      await registerSeller({
        ...data,
        lastName: data.lastName || '',
      });
    } catch (err: any) {
      setErrorMsg(authService.formatError(err));
    }
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center overflow-hidden bg-background text-foreground noise-bg py-12 px-4 sm:px-6 lg:px-8">
      {/* Background Floating Orbs */}
      <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-purple-600/10 blur-[120px] orb-1 pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-indigo-500/10 blur-[120px] orb-2 pointer-events-none" />

      {/* Main card */}
      <div className="relative z-10 w-full max-w-[440px] animate-fade-up">
        {/* Portal Header */}
        <div className="flex flex-col items-center mb-6">
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
            <CardTitle className="text-xl font-bold">Register Shop</CardTitle>
            <CardDescription>Create a seller account and apply to open your craft store</CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {errorMsg && (
              <div className="flex items-center gap-2 p-3.5 rounded-xl border border-red-500/20 bg-red-500/10 text-xs text-red-400 animate-in fade-in slide-in-from-top-1">
                <ShieldAlert className="h-4 w-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-white/60 ml-1">First Name</label>
                  <Input
                    placeholder="John"
                    autoComplete="given-name"
                    error={!!errors.firstName}
                    {...formRegister('firstName')}
                  />
                  {errors.firstName && (
                    <p className="text-[10px] text-red-400 ml-1 mt-0.5">{errors.firstName.message}</p>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-white/60 ml-1">Last Name</label>
                  <Input
                    placeholder="Doe"
                    autoComplete="family-name"
                    error={!!errors.lastName}
                    {...formRegister('lastName')}
                  />
                  {errors.lastName && (
                    <p className="text-[10px] text-red-400 ml-1 mt-0.5">{errors.lastName.message}</p>
                  )}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-white/60 ml-1">Username</label>
                <Input
                  placeholder="johndoe"
                  error={!!errors.username}
                  {...formRegister('username')}
                />
                {errors.username && (
                  <p className="text-[10px] text-red-400 ml-1 mt-0.5">{errors.username.message}</p>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-white/60 ml-1">Email address</label>
                <Input
                  type="email"
                  placeholder="name@example.com"
                  autoComplete="email"
                  error={!!errors.email}
                  {...formRegister('email')}
                />
                {errors.email && (
                  <p className="text-[10px] text-red-400 ml-1 mt-0.5">{errors.email.message}</p>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-white/60 ml-1">Password</label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  autoComplete="new-password"
                  error={!!errors.password}
                  {...formRegister('password')}
                />
                {errors.password && (
                  <p className="text-[10px] text-red-400 ml-1 mt-0.5">{errors.password.message}</p>
                )}
              </div>

              <Button type="submit" className="w-full mt-2.5" isLoading={isRegistering}>
                <span>Create Seller Account</span>
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </form>

            <div className="relative flex items-center py-1.5">
              <div className="flex-grow border-t border-white/[0.08]" />
              <span className="mx-3 text-[10px] font-medium text-white/30 uppercase tracking-wider">or</span>
              <div className="flex-grow border-t border-white/[0.08]" />
            </div>

            <GoogleButton label="Sign up with Google" onError={(msg) => {
              useConfirmStore.getState().showAlert({
                title: 'Portal Restriction',
                message: msg,
                confirmText: 'Acknowledge',
              });
            }} />
          </CardContent>

          <CardFooter className="flex justify-center pt-2 pb-6 border-t border-white/5">
            <p className="text-xs text-white/45">
              Already have an account?{' '}
              <Link href="/login" className="text-purple-400 hover:text-purple-300 font-semibold hover:underline">
                Sign In
              </Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
