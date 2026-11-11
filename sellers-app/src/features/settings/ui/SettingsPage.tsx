'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/shared/components/Card';
import { Button } from '@/shared/components/Button';
import { Input } from '@/shared/components/Input';
import { z } from 'zod';
import { CheckCircle, AlertTriangle, KeyRound, UserMinus } from 'lucide-react';

const profileFormSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().optional(),
  username: z.string().min(3, 'Username must be at least 3 characters'),
  phone: z.string().min(10, 'Please enter a valid phone number'),
});

type ProfileFormInput = z.infer<typeof profileFormSchema>;

import { useConfirmStore } from '@/lib/store/confirmStore';

export function SettingsPage() {
  const { user, updateProfile, isUpdatingProfile, deactivateAccount, isDeactivating } = useAuth();
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const showConfirm = useConfirmStore((state) => state.showConfirm);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProfileFormInput>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      username: user?.username || '',
      phone: user?.phone || '',
    },
  });

  const onSubmit = async (data: ProfileFormInput) => {
    setSuccessMsg(null);
    setErrorMsg(null);
    try {
      await updateProfile(data);
      setSuccessMsg('Profile details updated successfully.');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update profile details.');
    }
  };

  const handleDeactivate = () => {
    showConfirm({
      title: 'Deactivate Account',
      message: 'WARNING: Deactivating your account will block login and hide listings. You have 30 days to log back in to reverse deletion. Are you sure you want to proceed?',
      confirmText: 'Deactivate',
      onConfirm: async () => {
        setErrorMsg(null);
        try {
          await deactivateAccount();
        } catch (err: any) {
          setErrorMsg(err.message || 'Failed to deactivate account.');
        }
      },
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-4xl animate-fade-up">
        {/* Title */}
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-white/95">Settings</h1>
          <p className="text-xs text-white/45">Configure your personal seller identity and account options.</p>
        </div>

        {successMsg && (
          <div className="flex items-center gap-2 p-3.5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-xs text-emerald-400">
            <CheckCircle className="h-4 w-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="flex items-center gap-2 p-3.5 rounded-xl border border-red-500/20 bg-red-500/10 text-xs text-red-400">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Profile Card */}
        <Card className="border border-white/5">
          <CardHeader className="border-b border-white/5 pb-4">
            <CardTitle className="text-sm font-bold text-white/90">Personal Profile</CardTitle>
            <CardDescription>Update your personal account credentials</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-white/60 ml-1">First Name</label>
                  <Input placeholder="John" {...register('firstName')} error={!!errors.firstName} />
                  {errors.firstName && (
                    <p className="text-[9px] text-red-400 ml-1">{errors.firstName.message}</p>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-white/60 ml-1">Last Name</label>
                  <Input placeholder="Doe" {...register('lastName')} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-white/60 ml-1">Username</label>
                  <Input placeholder="johndoe" {...register('username')} error={!!errors.username} />
                  {errors.username && (
                    <p className="text-[9px] text-red-400 ml-1">{errors.username.message}</p>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-white/60 ml-1">Phone Number</label>
                  <Input placeholder="+91 98765 43210" {...register('phone')} error={!!errors.phone} />
                  {errors.phone && (
                    <p className="text-[9px] text-red-400 ml-1">{errors.phone.message}</p>
                  )}
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button type="submit" isLoading={isUpdatingProfile}>
                  Save Changes
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Security / Info */}
        <Card className="border border-white/5">
          <CardHeader className="border-b border-white/5 pb-4">
            <CardTitle className="text-sm font-bold text-white/90 flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-purple-400" />
              <span>Login Security</span>
            </CardTitle>
            <CardDescription>Your account credentials information</CardDescription>
          </CardHeader>
          <CardContent className="pt-5 space-y-4">
            <div>
              <span className="text-[10px] text-white/45 uppercase font-bold block">Login Email</span>
              <span className="text-xs font-semibold text-white/95 mt-0.5 block">{user?.email}</span>
            </div>
            <div>
              <span className="text-[10px] text-white/45 uppercase font-bold block">Authentication Type</span>
              <span className="text-xs font-semibold text-white/95 mt-0.5 block">Email & Password Credentials</span>
            </div>
          </CardContent>
        </Card>

        {/* Deactivation zone */}
        <Card className="border border-red-500/20 bg-red-500/5">
          <CardHeader>
            <CardTitle className="text-sm font-bold text-red-400 flex items-center gap-2">
              <UserMinus className="h-4.5 w-4.5" />
              <span>Deactivate Account</span>
            </CardTitle>
            <CardDescription className="text-red-400/60">Temporarily freeze your seller account</CardDescription>
          </CardHeader>
          <CardContent className="pt-2 flex justify-between items-center">
            <div>
              <p className="text-[10px] text-white/40 leading-relaxed max-w-lg">
                Freeze logins and set active products offline immediately. Your store profile can be restored at any time within 30 days by signing back in.
              </p>
            </div>
            <Button variant="destructive" size="sm" onClick={handleDeactivate} isLoading={isDeactivating} className="shrink-0 ml-4 font-bold">
              Deactivate
            </Button>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
