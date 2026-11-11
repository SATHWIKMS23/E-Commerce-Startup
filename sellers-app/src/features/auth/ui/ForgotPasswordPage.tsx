'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { authApi } from '../api/authApi';
import { authService } from '../services/authService';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/shared/components/Card';
import { Input } from '@/shared/components/Input';
import { Button } from '@/shared/components/Button';
import { Store, ArrowRight, ArrowLeft, KeyRound, CheckCircle2, ShieldAlert } from 'lucide-react';

const requestSchema = z.object({
  loginIdentifier: z.string().min(1, 'Email or Username is required'),
});

const otpSchema = z.object({
  otp: z.string().length(6, 'OTP must be exactly 6 digits').regex(/^[0-9]+$/, 'OTP must be numeric'),
});

const resetSchema = z.object({
  newPassword: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string().min(6, 'Confirm password must be at least 6 characters'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

type RequestInput = z.infer<typeof requestSchema>;
type OtpInput = z.infer<typeof otpSchema>;
type ResetInput = z.infer<typeof resetSchema>;

import { useSellerLayout } from '@/lib/hooks/useSellerLayout';

export function ForgotPasswordPage() {
  const { branding } = useSellerLayout();
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // States to pass info between steps
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [email, setEmail] = useState('');
  const [resetToken, setResetToken] = useState('');

  // Auto-fill and verify OTP if present in hash fragment
  useEffect(() => {
    const hash = window.location.hash;
    if (hash && hash.startsWith('#')) {
      const params = new URLSearchParams(hash.substring(1));
      const otpCode = params.get('otp');
      const username = params.get('username') || params.get('email');

      if (otpCode && username) {
        setLoginIdentifier(username);
        setLoading(true);
        setErrorMsg(null);
        setStep(2);
        authApi.verifyOtp({ identifier: username, otp: otpCode })
          .then((res) => {
            setResetToken(res.resetToken);
            setStep(3);
          })
          .catch((err) => {
            setErrorMsg(err.response?.data?.message || authService.formatError(err));
            setStep(2);
          })
          .finally(() => {
            setLoading(false);
          });
      }
    }
  }, []);

  // Step 1 Form
  const {
    register: registerReq,
    handleSubmit: handleSubmitReq,
    formState: { errors: errorsReq },
  } = useForm<RequestInput>({
    resolver: zodResolver(requestSchema),
  });

  // Step 2 Form
  const {
    register: registerOtp,
    handleSubmit: handleSubmitOtp,
    formState: { errors: errorsOtp },
  } = useForm<OtpInput>({
    resolver: zodResolver(otpSchema),
  });

  // Step 3 Form
  const {
    register: registerReset,
    handleSubmit: handleSubmitReset,
    formState: { errors: errorsReset },
  } = useForm<ResetInput>({
    resolver: zodResolver(resetSchema),
  });

  const handleRequestOtp = async (data: RequestInput) => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await authApi.forgotPassword({ identifier: data.loginIdentifier });
      setLoginIdentifier(data.loginIdentifier);
      setEmail(res.email);
      setStep(2);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || authService.formatError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (data: OtpInput) => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await authApi.verifyOtp({ identifier: loginIdentifier, otp: data.otp });
      setResetToken(res.resetToken);
      setStep(3);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || authService.formatError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (data: ResetInput) => {
    setLoading(true);
    setErrorMsg(null);
    try {
      await authApi.resetPassword({ resetToken, newPassword: data.newPassword });
      setStep(4);
      setTimeout(() => {
        router.push('/login');
      }, 3000);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || authService.formatError(err));
    } finally {
      setLoading(false);
    }
  };

  const [logoError, setLogoError] = useState(false);
  const hasValidLogo = Boolean(!logoError && branding?.logo && branding.logo.trim() !== '');

  return (
    <div className="min-h-screen bg-background bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.2),rgba(255,255,255,0))] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md flex flex-col items-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/[0.04] border border-white/10 mb-4 shadow-lg overflow-hidden shrink-0">
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
        <h2 className="text-center text-3xl font-extrabold tracking-tight text-white">
          {branding?.name || 'Seller Portal'}
        </h2>
        <p className="mt-1 text-center text-xs text-white/40 uppercase tracking-widest font-semibold">
          Password Recovery Wizard
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <Card className="border border-white/10 shadow-2xl bg-zinc-950/80 backdrop-blur-xl">
          <CardHeader className="space-y-1 pb-4 border-b border-white/5">
            <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-purple-400" />
              {step === 1 && 'Request Password Reset'}
              {step === 2 && 'Verify OTP Code'}
              {step === 3 && 'Create New Password'}
              {step === 4 && 'Password Updated!'}
            </CardTitle>
            <CardDescription className="text-xs text-white/50">
              {step === 1 && 'Enter your username or email address to receive a 6-digit verification code.'}
              {step === 2 && `We logged a 6-digit code to the terminal console for ${email || 'your email'}.`}
              {step === 3 && 'Specify a new secure password for your seller portal account.'}
              {step === 4 && 'Your password has been successfully updated. Redirecting to login page...'}
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-6 space-y-4">
            {errorMsg && (
              <div className="p-3 text-xs font-semibold text-red-400 bg-red-500/10 rounded-xl border border-red-500/20 flex items-start gap-2.5 animate-in fade-in duration-200">
                <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* STEP 1: Enter Username/Email */}
            {step === 1 && (
              <form onSubmit={handleSubmitReq(handleRequestOtp)} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-white/60 uppercase tracking-wider" htmlFor="loginIdentifier">
                    Email or Username
                  </label>
                  <Input
                    id="loginIdentifier"
                    type="text"
                    placeholder="Enter your email or username"
                    error={!!errorsReq.loginIdentifier}
                    disabled={loading}
                    {...registerReq('loginIdentifier')}
                  />
                  {errorsReq.loginIdentifier && (
                    <p className="text-[10px] text-red-400 mt-0.5">{errorsReq.loginIdentifier.message}</p>
                  )}
                </div>

                <Button type="submit" className="w-full mt-2" isLoading={loading}>
                  <span>Send verification code</span>
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </form>
            )}

            {/* STEP 2: Verify OTP */}
            {step === 2 && (
              <form onSubmit={handleSubmitOtp(handleVerifyOtp)} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-white/60 uppercase tracking-wider" htmlFor="otp">
                    6-Digit Verification Code (OTP)
                  </label>
                  <Input
                    id="otp"
                    type="text"
                    maxLength={6}
                    placeholder="e.g. 123456"
                    error={!!errorsOtp.otp}
                    disabled={loading}
                    {...registerOtp('otp')}
                  />
                  {errorsOtp.otp && (
                    <p className="text-[10px] text-red-400 mt-0.5">{errorsOtp.otp.message}</p>
                  )}
                </div>

                <Button type="submit" className="w-full mt-2" isLoading={loading}>
                  <span>Verify code</span>
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </form>
            )}

            {/* STEP 3: Enter New Password */}
            {step === 3 && (
              <form onSubmit={handleSubmitReset(handleResetPassword)} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-white/60 uppercase tracking-wider" htmlFor="newPassword">
                    New Password
                  </label>
                  <Input
                    id="newPassword"
                    type="password"
                    placeholder="Minimum 6 characters"
                    error={!!errorsReset.newPassword}
                    disabled={loading}
                    {...registerReset('newPassword')}
                  />
                  {errorsReset.newPassword && (
                    <p className="text-[10px] text-red-400 mt-0.5">{errorsReset.newPassword.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-white/60 uppercase tracking-wider" htmlFor="confirmPassword">
                    Confirm Password
                  </label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Re-type your password"
                    error={!!errorsReset.confirmPassword}
                    disabled={loading}
                    {...registerReset('confirmPassword')}
                  />
                  {errorsReset.confirmPassword && (
                    <p className="text-[10px] text-red-400 mt-0.5">{errorsReset.confirmPassword.message}</p>
                  )}
                </div>

                <Button type="submit" className="w-full mt-2" isLoading={loading}>
                  <span>Reset password</span>
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </form>
            )}

            {/* STEP 4: Success Message */}
            {step === 4 && (
              <div className="flex flex-col items-center justify-center py-6 space-y-4">
                <div className="h-16 w-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <CheckCircle2 className="h-10 w-10 animate-bounce" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-bold text-white">Password Updated Successfully!</p>
                  <p className="text-xs text-white/40 mt-1">Please wait while we redirect you back to sign in...</p>
                </div>
              </div>
            )}
          </CardContent>

          <CardFooter className="flex justify-center pt-2 pb-6 border-t border-white/5">
            <Link
              href="/login"
              className="text-xs font-medium text-purple-400 hover:text-purple-300 transition-colors flex items-center gap-1.5"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to login
            </Link>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
