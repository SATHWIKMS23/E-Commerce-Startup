import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AlertTriangle } from 'lucide-react-native';
import { Colors } from '@/theme/colors';

interface SellerAgreementBannerProps {
  shopStatus?: string;
}

export function SellerAgreementBanner({ shopStatus }: SellerAgreementBannerProps) {
  if (!shopStatus || shopStatus === 'APPROVED') return null;

  const isRejected = shopStatus === 'REJECTED' || shopStatus === 'SUSPENDED' || shopStatus === 'DISABLED';
  const borderColor = isRejected ? Colors.roseBorder : Colors.yellowBorder;
  const bgColor = isRejected ? 'rgba(244, 63, 94, 0.08)' : 'rgba(245, 158, 11, 0.08)';
  const textColor = isRejected ? Colors.rose : Colors.yellow;

  return (
    <View style={[styles.banner, { borderColor, backgroundColor: bgColor }]}>
      <AlertTriangle size={18} color={textColor} style={{ marginRight: 10, marginTop: 1 }} />
      <View style={{ flex: 1 }}>
        <Text style={[styles.title, { color: textColor }]}>
          {shopStatus === 'PENDING' && 'Store Profile Awaiting Approval'}
          {shopStatus === 'REJECTED' && 'Store Application Rejected'}
          {shopStatus === 'SUSPENDED' && 'Store Suspended'}
          {shopStatus === 'DISABLED' && 'Store Disabled by Administrator'}
        </Text>
        <Text style={styles.desc}>
          {shopStatus === 'PENDING' &&
            'Your storefront is under admin review. You can prepare your product catalog, but items remain unlisted until final approval.'}
          {shopStatus === 'REJECTED' &&
            'Your application requires attention. Review your shop configuration and contact marketplace support.'}
          {shopStatus === 'SUSPENDED' &&
            'Your seller operations are temporarily paused. Contact merchant compliance for resolution.'}
          {shopStatus === 'DISABLED' &&
            'This shop has been disabled. Features and listings are locked.'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 16,
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 3,
  },
  desc: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.65)',
    lineHeight: 16,
  },
});
