'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ShoppingBag, RefreshCw } from 'lucide-react';
import { useBranding } from '@/lib/providers/BrandingProvider';
import { Skeleton } from '@/shared/components/Skeleton';

interface BrandLogoProps {
  className?: string;
  showText?: boolean;
  textClassName?: string;
  logoSizeClassName?: string;
}

export function BrandLogo({
  className = '',
  showText = true,
  textClassName = 'text-lg sm:text-xl font-black tracking-tight text-white',
  logoSizeClassName = 'h-8 w-8',
}: BrandLogoProps) {
  const { branding, isLoading, isError, refetchBranding } = useBranding();
  const [imageError, setImageError] = useState(false);

  const brandName = branding?.name || branding?.marketplaceName;
  const logoUrl = branding?.logo || branding?.logoUrl;

  useEffect(() => {
    setImageError(false);
  }, [logoUrl]);

  // While admin-managed branding is loading on a fresh session,
  // display the application's existing glass skeleton loader immediately.
  if (isLoading && !brandName) {
    return (
      <div className={`flex items-center gap-2 shrink-0 ${className}`} aria-label="Loading branding...">
        <Skeleton variant="glass" className={`${logoSizeClassName} rounded-lg`} />
        {showText && (
          <Skeleton variant="glass" className="h-6 w-28 rounded-md" />
        )}
      </div>
    );
  }

  const hasValidLogo = Boolean(!imageError && logoUrl && logoUrl.trim() !== '');

  return (
    <Link href="/" className={`flex items-center gap-2 group shrink-0 ${className}`}>
      {hasValidLogo ? (
        <img
          src={logoUrl}
          alt={brandName || 'Marketplace'}
          className={`${logoSizeClassName} object-contain block shrink-0`}
          onError={() => setImageError(true)}
        />
      ) : (
        <ShoppingBag className="h-6 w-6 text-white shrink-0" />
      )}
      {showText && (
        brandName ? (
          <span className={textClassName}>
            {brandName}
          </span>
        ) : isError ? (
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              refetchBranding();
            }}
            className="flex items-center gap-1 text-[11px] font-medium text-white/50 hover:text-white transition-colors"
            title="Retry loading branding"
          >
            <RefreshCw className="h-3 w-3" />
            <span>Retry</span>
          </button>
        ) : null
      )}
    </Link>
  );
}

