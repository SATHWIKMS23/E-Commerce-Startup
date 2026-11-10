import React, { useState } from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { ShoppingBag } from 'lucide-react-native';
import { useBranding } from '../context/BrandingContext';

interface BrandLogoProps {
  fontSize?: number;
  showText?: boolean;
  size?: number;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  fontSize = 17,
  showText = true,
  size = 32,
}) => {
  const { branding } = useBranding();
  const [imageError, setImageError] = useState(false);

  const brandName = branding?.name || branding?.marketplaceName || 'Atlas Basket';
  const logoUrl = branding?.logoUrl || branding?.logo;
  const hasValidLogo = Boolean(!imageError && logoUrl && logoUrl.trim() !== '');

  return (
    <View style={styles.container}>
      <View style={[styles.logoWrapper, { width: size, height: size }]}>
        {hasValidLogo ? (
          <Image
            source={{ uri: logoUrl }}
            style={{ width: size, height: size, borderRadius: 8 }}
            resizeMode="contain"
            onError={() => setImageError(true)}
          />
        ) : (
          <View style={[styles.fallbackBadge, { width: size, height: size }]}>
            <ShoppingBag size={size * 0.55} color="#ffffff" />
          </View>
        )}
      </View>

      {showText && (
        <Text style={[styles.brandText, { fontSize }]} numberOfLines={1}>
          {brandName}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    flexShrink: 0,
  },
  logoWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    flexShrink: 0,
  },
  fallbackBadge: {
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandText: {
    color: '#ffffff',
    fontWeight: '900',
    letterSpacing: -0.4,
    flexShrink: 0,
  },
});
