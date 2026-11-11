'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSellerProfile } from '../hooks/useSellerProfile';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/shared/components/Card';
import { Button } from '@/shared/components/Button';
import { Input } from '@/shared/components/Input';
import { Badge } from '@/shared/components/Badge';
import { Skeleton } from '@/shared/components/Skeleton';
import { SearchableDropdown } from '@/components/ui/SearchableDropdown';
import { useQuery } from '@tanstack/react-query';
import { shopApi } from '@/features/shop/api/shopApi';
import {
  User,
  Mail,
  Phone,
  Store,
  Calendar,
  Edit3,
  PlusCircle,
  Eye,
  CheckCircle,
  AlertTriangle,
  Building2,
  CreditCard,
} from 'lucide-react';

export function SellerProfilePage() {
  const { profile, isLoading, isError, updateProfile, isUpdating } = useSellerProfile();
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { data: locationsConfig } = useQuery({
    queryKey: ['seller-locations-config'],
    queryFn: shopApi.getLocationsStates,
    staleTime: 10 * 60 * 1000,
  });

  const allStates = locationsConfig?.allStates ?? [];

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    avatarUrl: '',
    businessName: '',
    gstNumber: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'India',
    bio: '',
  });

  const selectedState = formData.state;

  const { data: districtsData } = useQuery({
    queryKey: ['seller-locations-districts', selectedState],
    queryFn: () => shopApi.getLocationsDistricts(selectedState),
    enabled: !!selectedState,
    staleTime: 10 * 60 * 1000,
  });

  const districts = districtsData?.allDistricts ?? [];

  const startEditing = () => {
    if (!profile) return;
    setFormData({
      firstName: profile.seller.firstName || '',
      lastName: profile.seller.lastName || '',
      phone: profile.seller.phone || '',
      avatarUrl: profile.seller.avatarUrl || '',
      businessName: profile.shop?.businessName || '',
      gstNumber: profile.shop?.gstNumber || '',
      addressLine1: '',
      addressLine2: '',
      city: '',
      state: '',
      postalCode: '',
      country: 'India',
      bio: '',
    });
    setIsEditing(true);
    setSuccessMsg(null);
    setErrorMsg(null);
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setSuccessMsg(null);
    setErrorMsg(null);
  };

  const handleSave = async () => {
    try {
      setSuccessMsg(null);
      setErrorMsg(null);
      const payload: Record<string, any> = {};
      if (formData.firstName !== profile?.seller.firstName) payload.firstName = formData.firstName;
      if (formData.lastName !== profile?.seller.lastName) payload.lastName = formData.lastName;
      if (formData.phone !== profile?.seller.phone) payload.phone = formData.phone;
      if (formData.avatarUrl !== profile?.seller.avatarUrl) payload.avatarUrl = formData.avatarUrl;
      if (formData.businessName !== profile?.shop?.businessName) payload.businessName = formData.businessName;
      if (formData.gstNumber !== profile?.shop?.gstNumber) payload.gstNumber = formData.gstNumber;
      if (formData.addressLine1) payload.addressLine1 = formData.addressLine1;
      if (formData.addressLine2) payload.addressLine2 = formData.addressLine2;
      if (formData.city) payload.city = formData.city;
      if (formData.state) payload.state = formData.state;
      if (formData.postalCode) payload.postalCode = formData.postalCode;
      if (formData.country) payload.country = formData.country;
      if (formData.bio) payload.bio = formData.bio;

      await updateProfile(payload);
      setSuccessMsg('Profile updated successfully');
      setIsEditing(false);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update profile');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <Badge variant="success">Active</Badge>;
      case 'DISABLED':
        return <Badge variant="secondary">Disabled</Badge>;
      case 'BANNED':
        return <Badge variant="destructive">Banned</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6 max-w-4xl animate-fade-up">
          <div className="space-y-1">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-72 mt-2" />
          </div>
          <Card className="border border-white/5">
            <CardContent className="p-6 space-y-4">
              <Skeleton className="h-20 w-20 rounded-full" />
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-4 w-32" />
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  if (isError || !profile) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
          <AlertTriangle className="h-12 w-12 text-red-400" />
          <p className="text-sm text-white/60">Failed to load profile. Please try again.</p>
          <Button onClick={() => window.location.reload()}>Retry</Button>
        </div>
      </DashboardLayout>
    );
  }

  const { seller, shop, verification, profileCompletion } = profile;

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-4xl animate-fade-up">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-white/95">Seller Profile</h1>
          <p className="text-xs text-white/45">View and manage your seller account information.</p>
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card className="border border-white/5">
              <CardHeader className="border-b border-white/5 pb-4 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold text-white/90">Personal Information</CardTitle>
                  <CardDescription>Your seller account details</CardDescription>
                </div>
                {!isEditing && (
                  <Button size="sm" variant="outline" onClick={startEditing}>
                    <Edit3 className="h-3.5 w-3.5 mr-1.5" />
                    Edit Profile
                  </Button>
                )}
              </CardHeader>
              <CardContent className="pt-6">
                {isEditing ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-4 mb-4">
                      {formData.avatarUrl ? (
                        <img
                          src={formData.avatarUrl}
                          alt="Avatar"
                          loading="lazy"
                          className="h-16 w-16 rounded-full object-cover border border-white/10"
                        />
                      ) : (
                        <div className="h-16 w-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                          <User className="h-8 w-8 text-white/30" />
                        </div>
                      )}
                      <div className="flex-1">
                        <label className="text-[10px] font-bold text-white/60 ml-1">Avatar URL</label>
                        <Input
                          value={formData.avatarUrl}
                          onChange={(e) => setFormData(prev => ({ ...prev, avatarUrl: e.target.value }))}
                          placeholder="https://example.com/avatar.jpg"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-white/60 ml-1">First Name</label>
                        <Input
                          value={formData.firstName}
                          onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                          placeholder="First Name"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-white/60 ml-1">Last Name</label>
                        <Input
                          value={formData.lastName}
                          onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                          placeholder="Last Name"
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-white/60 ml-1">Phone</label>
                      <Input
                        value={formData.phone}
                        onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                        placeholder="Phone Number"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-white/60 ml-1">Business Name</label>
                      <Input
                        value={formData.businessName}
                        onChange={(e) => setFormData(prev => ({ ...prev, businessName: e.target.value }))}
                        placeholder="Business Name"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-white/60 ml-1">GST Number</label>
                      <Input
                        value={formData.gstNumber}
                        onChange={(e) => setFormData(prev => ({ ...prev, gstNumber: e.target.value }))}
                        placeholder="GST Number"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-white/60 ml-1">Address Line 1</label>
                      <Input
                        value={formData.addressLine1}
                        onChange={(e) => setFormData(prev => ({ ...prev, addressLine1: e.target.value }))}
                        placeholder="Address Line 1"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-white/60 ml-1">Address Line 2</label>
                      <Input
                        value={formData.addressLine2}
                        onChange={(e) => setFormData(prev => ({ ...prev, addressLine2: e.target.value }))}
                        placeholder="Address Line 2"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-white/60 ml-1">State</label>
                        <SearchableDropdown
                          options={allStates.map((s: any) => ({ name: s.name, isEnabled: s.isEnabled !== false }))}
                          value={formData.state}
                          onChange={(name: string) => {
                            setFormData(prev => ({ ...prev, state: name, city: '' }));
                          }}
                          placeholder="Select state"
                          label="State"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-white/60 ml-1">District / City</label>
                        <SearchableDropdown
                          options={districts.map((d: any) => ({ name: d.name, isEnabled: d.isEnabled !== false }))}
                          value={formData.city}
                          onChange={(name: string) => setFormData(prev => ({ ...prev, city: name }))}
                          placeholder={selectedState ? 'Select district' : 'Select a state first'}
                          label="District"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-white/60 ml-1">Postal Code</label>
                        <Input
                          value={formData.postalCode}
                          onChange={(e) => setFormData(prev => ({ ...prev, postalCode: e.target.value }))}
                          placeholder="Postal Code"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-white/60 ml-1">Country</label>
                        <Input
                          value={formData.country}
                          onChange={(e) => setFormData(prev => ({ ...prev, country: e.target.value }))}
                          placeholder="Country"
                          disabled
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-white/60 ml-1">Bio</label>
                      <textarea
                        value={formData.bio}
                        onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                        placeholder="Tell us about your business"
                        className="w-full h-24 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-xs text-white/90 placeholder:text-white/20 outline-none focus:border-white/20 transition-colors resize-none"
                      />
                    </div>
                    <div className="flex gap-3 pt-2">
                      <Button onClick={handleSave} isLoading={isUpdating}>
                        Save Changes
                      </Button>
                      <Button variant="secondary" onClick={cancelEditing}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center gap-4 mb-4">
                      {seller.avatarUrl ? (
                        <img
                          src={seller.avatarUrl}
                          alt="Profile"
                          loading="lazy"
                          className="h-16 w-16 rounded-full object-cover border border-white/10"
                        />
                      ) : (
                        <div className="h-16 w-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                          <User className="h-8 w-8 text-white/30" />
                        </div>
                      )}
                      <div>
                        <h3 className="text-sm font-bold text-white/95">{seller.firstName} {seller.lastName}</h3>
                        <p className="text-[10px] text-white/45">@{seller.username}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-[10px] text-white/45 uppercase font-bold block">First Name</span>
                        <span className="text-xs font-semibold text-white/95 mt-0.5 block flex items-center gap-2">
                          <User className="h-3.5 w-3.5 text-white/30" />
                          {seller.firstName}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-white/45 uppercase font-bold block">Last Name</span>
                        <span className="text-xs font-semibold text-white/95 mt-0.5 block">{seller.lastName || '—'}</span>
                      </div>
                    </div>
                    <div>
                      <span className="text-[10px] text-white/45 uppercase font-bold block">Email</span>
                      <span className="text-xs font-semibold text-white/95 mt-0.5 block flex items-center gap-2">
                        <Mail className="h-3.5 w-3.5 text-white/30" />
                        {seller.email}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-white/45 uppercase font-bold block">Phone</span>
                      <span className="text-xs font-semibold text-white/95 mt-0.5 block flex items-center gap-2">
                        <Phone className="h-3.5 w-3.5 text-white/30" />
                        {seller.phone || 'Not provided'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-white/45 uppercase font-bold block">Username</span>
                      <span className="text-xs font-semibold text-white/95 mt-0.5 block">@{seller.username}</span>
                    </div>
                    {shop?.businessName && (
                      <div>
                        <span className="text-[10px] text-white/45 uppercase font-bold block">Business Name</span>
                        <span className="text-xs font-semibold text-white/95 mt-0.5 block flex items-center gap-2">
                          <Building2 className="h-3.5 w-3.5 text-white/30" />
                          {shop.businessName}
                        </span>
                      </div>
                    )}
                    {shop?.gstNumber && (
                      <div>
                        <span className="text-[10px] text-white/45 uppercase font-bold block">GST Number</span>
                        <span className="text-xs font-semibold text-white/95 mt-0.5 block flex items-center gap-2">
                          <CreditCard className="h-3.5 w-3.5 text-white/30" />
                          {shop.gstNumber}
                        </span>
                      </div>
                    )}
                    <div>
                      <span className="text-[10px] text-white/45 uppercase font-bold block">Member Since</span>
                      <span className="text-xs font-semibold text-white/95 mt-0.5 block flex items-center gap-2">
                        <Calendar className="h-3.5 w-3.5 text-white/30" />
                        {new Date(seller.createdAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {shop && (
              <Card className="border border-white/5">
                <CardHeader className="border-b border-white/5 pb-4">
                  <CardTitle className="text-sm font-bold text-white/90 flex items-center gap-2">
                    <Store className="h-4 w-4 text-purple-400" />
                    Shop Details
                  </CardTitle>
                  <CardDescription>Your registered shop information</CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-[10px] text-white/45 uppercase font-bold block">Shop Name</span>
                        <span className="text-xs font-semibold text-white/95 mt-0.5 block">{shop.name}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-white/45 uppercase font-bold block">Slug</span>
                        <span className="text-xs font-semibold text-white/95 mt-0.5 block">/{shop.slug}</span>
                      </div>
                    </div>
                    {shop.gstNumber && (
                      <div>
                        <span className="text-[10px] text-white/45 uppercase font-bold block">GST Number</span>
                        <span className="text-xs font-semibold text-white/95 mt-0.5 block">{shop.gstNumber}</span>
                      </div>
                    )}
                    <div>
                      <span className="text-[10px] text-white/45 uppercase font-bold block">Shop Created</span>
                      <span className="text-xs font-semibold text-white/95 mt-0.5 block">
                        {new Date(shop.createdAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="space-y-6">
            <Card className="border border-white/5">
              <CardHeader className="border-b border-white/5 pb-4">
                <CardTitle className="text-sm font-bold text-white/90">Account Status</CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <div>
                  <span className="text-[10px] text-white/45 uppercase font-bold block">Verification Status</span>
                  <div className="mt-1">{getStatusBadge(seller.status)}</div>
                </div>

                {verification && (
                  <div>
                    <span className="text-[10px] text-white/45 uppercase font-bold block">GST Verification</span>
                    <div className="mt-1">
                      <Badge variant={verification.status === 'APPROVED' ? 'success' : verification.status === 'REJECTED' ? 'destructive' : 'default'}>
                        {verification.status}
                      </Badge>
                    </div>
                  </div>
                )}

                <div>
                  <span className="text-[10px] text-white/45 uppercase font-bold block">Shop</span>
                  <div className="mt-1">
                    {shop ? (
                      <Badge variant={shop.status === 'APPROVED' ? 'success' : 'secondary'}>
                        {shop.status}
                      </Badge>
                    ) : (
                      <Badge variant="destructive">Not Created</Badge>
                    )}
                  </div>
                </div>

                <div>
                  <span className="text-[10px] text-white/45 uppercase font-bold block">Profile Completion</span>
                  <div className="mt-2">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 rounded-full bg-white/10 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 transition-all duration-500"
                          style={{ width: `${profileCompletion}%` }}
                        />
                      </div>
                      <span className="text-xs font-bold text-white/70">{profileCompletion}%</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-3">
              {shop ? (
                <Button
                  className="w-full"
                  variant="outline"
                  onClick={() => router.push('/shop')}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  View Shop
                </Button>
              ) : (
                <Button
                  className="w-full"
                  onClick={() => router.push('/shop-setup')}
                >
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Create Shop
                </Button>
              )}

              {!isEditing && (
                <Button
                  className="w-full"
                  variant="secondary"
                  onClick={startEditing}
                >
                  <Edit3 className="h-4 w-4 mr-2" />
                  Edit Profile
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
