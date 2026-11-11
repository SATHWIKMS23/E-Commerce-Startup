'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useShop } from '../hooks/useShop';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { getShopSetupSchema } from '../services/shopService';
import type { ShopSetupInput } from '../services/shopService';
import { Button } from '@/shared/components/Button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/shared/components/Card';
import { Input } from '@/shared/components/Input';
import { Skeleton } from '@/shared/components/Skeleton';
import { Store, ShieldAlert, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { shopApi } from '../api/shopApi';
import { useLocationStore } from '@/lib/store/locationStore';

import { SearchableDropdown } from '@/components/ui/SearchableDropdown';
import { LocationCoordinatesInput } from '@/features/location/ui/LocationCoordinatesInput';

export function ShopSetupPage() {
  const { createShop, isCreatingShop } = useShop();
  const { user } = useAuth();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [gstRegistered, setGstRegistered] = useState(true);
  const [gstNumber, setGstNumber] = useState('');
  const [gstDeclared, setGstDeclared] = useState(false);
  const router = useRouter();

  // Fetch active states & configurations from backend
  const { data: locationsConfig, isLoading: isLoadingConfig } = useQuery({
    queryKey: ['locations-config'],
    queryFn: shopApi.getLocationsStates,
    staleTime: 10 * 60 * 1000,
  });

  const allStates = locationsConfig?.allStates ?? [];
  const districtRequired = locationsConfig?.districtRequired !== false;

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ShopSetupInput>({
    resolver: zodResolver(getShopSetupSchema(districtRequired)),
    defaultValues: {
      country: 'India',
      state: '',
      city: '',
    },
  });

  // Manually register state and city for custom inputs
  useEffect(() => {
    register('state');
    register('city');
  }, [register]);

  const shopNameVal = watch('shopName');
  const selectedState = watch('state');

  // Fetch active districts/cities for the selected state
  const { data: districtsData, isLoading: isLoadingDistricts } = useQuery({
    queryKey: ['locations-districts', selectedState],
    queryFn: () => shopApi.getLocationsDistricts(selectedState),
    enabled: !!selectedState,
    staleTime: 10 * 60 * 1000,
  });

  const districts = districtsData?.allDistricts ?? [];
  const setComingSoon = useLocationStore((state) => state.setComingSoon);

  const selectedStateObj = allStates.find(
    (st: any) => st.name.toLowerCase() === (selectedState || '').toLowerCase()
  );

  const selectedDistrict = watch('city');
  const selectedDistrictObj = districts.find(
    (d: any) => d.name.toLowerCase() === (selectedDistrict || '').toLowerCase()
  );

  // Reset district selection if state changes
  useEffect(() => {
    setValue('city', '');
  }, [selectedState, setValue]);

  // Open Coming Soon dialog if selected state is inactive
  useEffect(() => {
    if (selectedState && selectedStateObj) {
      if (!selectedStateObj.isEnabled) {
        setComingSoon(true, selectedStateObj.name, undefined, () => {
          setValue('state', '');
        });
      }
    }
  }, [selectedState, selectedStateObj, setComingSoon, setValue]);

  // Open Coming Soon dialog if selected district is inactive
  useEffect(() => {
    if (selectedDistrict && selectedDistrictObj) {
      if (!selectedDistrictObj.isEnabled) {
        setComingSoon(true, selectedState, selectedDistrictObj.name, () => {
          setValue('city', '');
        });
      }
    }
  }, [selectedDistrict, selectedDistrictObj, selectedState, setComingSoon, setValue]);

  // Auto-generate slug when shop name changes
  useEffect(() => {
    if (shopNameVal) {
      const generated = shopNameVal
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');
      setValue('slug', generated, { shouldValidate: true });
    }
  }, [shopNameVal, setValue]);

  const handleStateChange = (stateName: string) => {
    setValue('state', stateName, { shouldValidate: true });
  };

  const handleDistrictChange = (districtName: string) => {
    setValue('city', districtName, { shouldValidate: true });
  };

  const [coordinates, setCoordinates] = useState<{
    latitude: number | null;
    longitude: number | null;
  }>({
    latitude: null,
    longitude: null,
  });

  const onSubmit = async (data: ShopSetupInput) => {
    setErrorMsg(null);
    try {
      if (gstRegistered) {
        if (!gstNumber.trim()) {
          throw new Error('GST Number is required when GST registered is selected.');
        }
        const cleanGst = gstNumber.trim().toUpperCase();
        const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
        if (!gstRegex.test(cleanGst)) {
          throw new Error('Invalid GST Number format. Must be a valid 15-character Indian GSTIN.');
        }
      } else {
        if (!gstDeclared) {
          throw new Error('You must check the declaration checkbox to confirm GST is not applicable.');
        }
      }

      await createShop({
        ...data,
        city: data.city || '',
        district: data.city,
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
        contactName: `${user?.firstName} ${user?.lastName ?? ''}`.trim(),
        type: 'STORE',
        label: 'PICKUP',
        gstRegistered,
        gstNumber: gstRegistered ? gstNumber.trim() : undefined,
      });
      router.push('/dashboard');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to initialize your shop profile.');
    }
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center overflow-hidden bg-background text-foreground noise-bg py-12 px-4 sm:px-6 lg:px-8">
      {/* Background Floating Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-purple-600/10 blur-[120px] orb-1 pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-indigo-500/10 blur-[120px] orb-2 pointer-events-none" />

      <div className="relative z-10 w-full max-w-[550px] animate-fade-up">
        <div className="flex flex-col items-center mb-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-900/80 to-indigo-900/80 glass border border-purple-500/30 mb-3 shadow-lg">
            <Store className="h-6 w-6 text-purple-400" />
          </div>
          <h1 className="text-xl font-bold text-white text-gradient">Set Up Your Store</h1>
          <p className="text-xs text-white/40 mt-1">Complete your registration profile to access the seller dashboard</p>
        </div>

        <Card className="border border-white/10 shadow-2xl">
          <CardHeader className="pb-4 border-b border-white/5">
            <CardTitle className="text-sm font-bold text-white/90">Store Information</CardTitle>
            <CardDescription>Configure details for customers and delivery pick-ups</CardDescription>
          </CardHeader>

          <CardContent className="pt-6 space-y-4">
            {errorMsg && (
              <div className="flex items-center gap-2 p-3.5 rounded-xl border border-red-500/20 bg-red-500/10 text-xs text-red-400">
                <ShieldAlert className="h-4 w-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-white/60 ml-1">Store Name</label>
                  <Input
                    placeholder="My Craft Shop"
                    error={!!errors.shopName}
                    {...register('shopName')}
                  />
                  {errors.shopName && (
                    <p className="text-[10px] text-red-400 ml-1 mt-0.5">{errors.shopName.message}</p>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-white/60 ml-1">Slug URL Path</label>
                  <Input
                    placeholder="my-craft-shop"
                    error={!!errors.slug}
                    {...register('slug')}
                  />
                  {errors.slug && (
                    <p className="text-[10px] text-red-400 ml-1 mt-0.5">{errors.slug.message}</p>
                  )}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-white/60 ml-1">Store Description</label>
                <textarea
                  placeholder="Describe your craft, materials used, 3D printing custom setups, business hours..."
                  rows={3}
                  className={`glass-input flex w-full rounded-xl px-3 py-2 text-sm text-white placeholder:text-white/25 outline-none resize-none min-h-[80px] border border-white/10 ${
                    errors.description ? 'border-red-500/50 focus:border-red-500/60' : ''
                  }`}
                  {...register('description')}
                />
                {errors.description && (
                  <p className="text-[10px] text-red-400 ml-1 mt-0.5">{errors.description.message}</p>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-white/60 ml-1">Store Phone Number</label>
                <Input
                  type="tel"
                  placeholder="e.g. +91 98765 43210"
                  error={!!errors.phone}
                  {...register('phone')}
                />
                {errors.phone && (
                  <p className="text-[10px] text-red-400 ml-1 mt-0.5">{errors.phone.message}</p>
                )}
              </div>

              <div className="border-t border-white/5 pt-3 mt-1 space-y-4">
                <LocationCoordinatesInput
                  latitude={coordinates.latitude}
                  longitude={coordinates.longitude}
                  onChange={setCoordinates}
                  helperText="Specify store pickup coordinates for delivery dispatch, or use your device's current location."
                />

                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-white/60 ml-1">Address Line 1</label>
                    <Input
                      placeholder="Flat, House no., Building, Street address"
                      error={!!errors.addressLine1}
                      {...register('addressLine1')}
                    />
                    {errors.addressLine1 && (
                      <p className="text-[10px] text-red-400 ml-1 mt-0.5">{errors.addressLine1.message}</p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-white/60 ml-1">Address Line 2 (Optional)</label>
                    <Input
                      placeholder="Apartment, Suite, Unit, Landmark"
                      {...register('addressLine2')}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {/* State selection */}
                    <div className="space-y-1">
                      {isLoadingConfig ? (
                        <Skeleton className="h-10 w-full rounded-xl" />
                      ) : (
                        <SearchableDropdown
                          options={allStates}
                          value={selectedState}
                          onChange={handleStateChange}
                          placeholder="Select State"
                          label="State"
                        />
                      )}
                      {errors.state && (
                        <p className="text-[10px] text-red-400 ml-1 mt-0.5">{errors.state.message}</p>
                      )}
                    </div>

                    {/* District selection */}
                    <div className="space-y-1">
                      {isLoadingDistricts ? (
                        <Skeleton className="h-10 w-full rounded-xl" />
                      ) : !selectedState ? (
                        <div className="space-y-1.5 relative w-full">
                          <label className="block text-[10px] font-bold text-white/50 uppercase tracking-wider">
                            District {districtRequired ? '' : '(Optional)'}
                          </label>
                          <button
                            type="button"
                            disabled
                            className="w-full h-10 flex items-center justify-between px-3 rounded-xl border border-white/10 bg-neutral-900/60 text-xs text-white/30 cursor-not-allowed text-left font-medium select-none"
                          >
                            Select a State first
                          </button>
                        </div>
                      ) : districts.length === 0 ? (
                        <div className="space-y-1.5 relative w-full">
                          <label className="block text-[10px] font-bold text-white/50 uppercase tracking-wider">
                            District {districtRequired ? '' : '(Optional)'}
                          </label>
                          <button
                            type="button"
                            disabled
                            className="w-full h-10 flex items-center justify-between px-3 rounded-xl border border-white/10 bg-neutral-900/60 text-xs text-white/30 cursor-not-allowed text-left font-medium select-none"
                          >
                            No operational districts available
                          </button>
                        </div>
                      ) : (
                        <SearchableDropdown
                          options={districts}
                          value={selectedDistrict || ''}
                          onChange={handleDistrictChange}
                          placeholder={districtRequired ? 'Select District' : 'Select District (Optional)'}
                          label={`District ${districtRequired ? '' : '(Optional)'}`}
                          isLoading={isLoadingDistricts}
                        />
                      )}
                      {errors.city && (
                        <p className="text-[10px] text-red-400 ml-1 mt-0.5">{errors.city.message}</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-white/60 ml-1">Postal Code</label>
                      <Input
                        placeholder="e.g. 560001"
                        error={!!errors.postalCode}
                        {...register('postalCode')}
                      />
                      {errors.postalCode && (
                        <p className="text-[10px] text-red-400 ml-1 mt-0.5">{errors.postalCode.message}</p>
                      )}
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-white/60 ml-1">Country</label>
                      <Input
                        value="India"
                        disabled
                        readOnly
                      />
                      <input type="hidden" value="India" {...register('country')} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Business Verification */}
              <div className="border-t border-white/5 pt-3 mt-1 space-y-3">
                <h4 className="text-xs font-bold text-white/80 mb-2">Business Verification</h4>
                
                <div className="space-y-2">
                  <span className="block text-xs font-semibold text-white/60 ml-1">GST Registered?</span>
                  <div className="flex gap-4 ml-1">
                    <label className="flex items-center gap-2 text-xs text-white/80 cursor-pointer select-none">
                      <input
                        type="radio"
                        name="gstRegisteredChoice"
                        checked={gstRegistered}
                        onChange={() => setGstRegistered(true)}
                        className="text-purple-600 focus:ring-purple-500 bg-black/40 border-white/10"
                      />
                      <span>Yes</span>
                    </label>
                    <label className="flex items-center gap-2 text-xs text-white/80 cursor-pointer select-none">
                      <input
                        type="radio"
                        name="gstRegisteredChoice"
                        checked={!gstRegistered}
                        onChange={() => setGstRegistered(false)}
                        className="text-purple-600 focus:ring-purple-500 bg-black/40 border-white/10"
                      />
                      <span>No</span>
                    </label>
                  </div>
                </div>

                {gstRegistered ? (
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-white/60 ml-1">GST Number *</label>
                    <Input
                      placeholder="e.g. 22AAAAA1111A1Z1"
                      value={gstNumber}
                      onChange={(e) => setGstNumber(e.target.value)}
                    />
                    <p className="text-[9px] text-white/40 ml-1">Format: 15-character Indian GSTIN</p>
                  </div>
                ) : (
                  <div className="space-y-2 ml-1">
                    <label className="flex items-start gap-2 text-xs text-white/70 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={gstDeclared}
                        onChange={(e) => setGstDeclared(e.target.checked)}
                        className="mt-0.5 rounded text-purple-600 focus:ring-purple-500 bg-black/40 border-white/10"
                      />
                      <span className="leading-tight text-[11px]">
                        I declare that GST registration is currently not applicable to my business.
                      </span>
                    </label>
                  </div>
                )}
              </div>

              <Button type="submit" className="w-full mt-4" isLoading={isCreatingShop}>
                <span>Initialize Shop</span>
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
