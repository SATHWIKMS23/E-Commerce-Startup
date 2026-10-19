'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ShoppingBag } from 'lucide-react';
import { useBranding } from '@/lib/providers/BrandingProvider';

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
  const { branding } = useBranding();
  const [imageError, setImageError] = useState(false);

  const logoUrl = branding?.logo || branding?.logoUrl;

  useEffect(() => {
    setImageError(false);
  }, [logoUrl]);

  const hasValidLogo = Boolean(!imageError && logoUrl && logoUrl.trim() !== '');

  return (
    <Link href="/" className={`flex items-center gap-2 group shrink-0 ${className}`}>
      {hasValidLogo ? (
        <img
          src={logoUrl}
          alt={branding?.name || 'Atlas Basket'}
          className={`${logoSizeClassName} object-contain block shrink-0`}
          onError={() => setImageError(true)}
        />
      ) : (
        <ShoppingBag className="h-6 w-6 text-white shrink-0" />
      )}
      {showText && (
        <span className={textClassName}>
          {branding?.name || 'Atlas Basket'}
        </span>
      )}
    </Link>
  );
}

