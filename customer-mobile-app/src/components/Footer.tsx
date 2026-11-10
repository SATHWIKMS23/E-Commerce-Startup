import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ArrowRight, ShoppingBag } from 'lucide-react-native';
import { BrandLogo } from './BrandLogo';
import { useBranding } from '../context/BrandingContext';
import { RootStackParamList } from '../navigation/types';

export const Footer: React.FC = () => {
  const { branding } = useBranding();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = () => {
    if (email.trim()) {
      setSubscribed(true);
      setEmail('');
      setTimeout(() => setSubscribed(false), 4000);
    }
  };

  return (
    <View style={styles.container}>
      {/* Brand Info */}
      <View style={styles.brandSection}>
        <BrandLogo fontSize={18} size={32} />
        <Text style={styles.brandDesc}>
          {branding.footerDescription ||
            'Discover local craft creators, purchase unique handmade items, and order custom-made 3D prints directly from makers on Atlas Basket.'}
        </Text>
      </View>

      {/* Newsletter signup */}
      <View style={styles.newsletterSection}>
        <Text style={styles.sectionTitle}>STAY UPDATED</Text>
        <Text style={styles.newsletterDesc}>
          Subscribe to hear about new local makers and special drops.
        </Text>
        <View style={styles.inputRow}>
          <TextInput
            placeholder="Enter your email"
            placeholderTextColor="rgba(255, 255, 255, 0.35)"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            style={styles.input}
          />
          <TouchableOpacity
            onPress={handleSubscribe}
            style={styles.subscribeBtn}
            activeOpacity={0.8}
          >
            <ArrowRight size={16} color="#000000" />
          </TouchableOpacity>
        </View>
        {subscribed && (
          <Text style={styles.subscribedText}>Thanks for subscribing!</Text>
        )}
      </View>

      {/* Navigation Columns */}
      <View style={styles.columnsContainer}>
        {/* Shop links */}
        <View style={styles.column}>
          <Text style={styles.sectionTitle}>SHOP</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Products')} style={styles.linkItem}>
            <Text style={styles.linkText}>All Products</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('Shops')} style={styles.linkItem}>
            <Text style={styles.linkText}>Local Shops</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('CustomOrders')} style={styles.linkItem}>
            <Text style={styles.linkText}>Custom 3D Prints</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('Categories')} style={styles.linkItem}>
            <Text style={styles.linkText}>Categories</Text>
          </TouchableOpacity>
        </View>

        {/* Support links */}
        <View style={styles.column}>
          <Text style={styles.sectionTitle}>SUPPORT</Text>
          <TouchableOpacity onPress={() => navigation.navigate('SupportChat')} style={styles.linkItem}>
            <Text style={styles.linkText}>Support Desk</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('Wishlist')} style={styles.linkItem}>
            <Text style={styles.linkText}>My Wishlist</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('OrderHistory')} style={styles.linkItem}>
            <Text style={styles.linkText}>Track Orders</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Copyright */}
      <View style={styles.copyrightRow}>
        <Text style={styles.copyrightText}>
          © {new Date().getFullYear()} {branding.name || 'Atlas Basket'}. All rights reserved.
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#0a0a0a',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 20,
    paddingTop: 36,
    paddingBottom: 48,
    gap: 28,
  },
  brandSection: {
    gap: 12,
  },
  brandDesc: {
    color: 'rgba(255, 255, 255, 0.45)',
    fontSize: 13,
    lineHeight: 20,
  },
  newsletterSection: {
    gap: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  sectionTitle: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  newsletterDesc: {
    color: 'rgba(255, 255, 255, 0.45)',
    fontSize: 12,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  input: {
    flex: 1,
    height: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: 12,
    color: '#ffffff',
    fontSize: 13,
  },
  subscribeBtn: {
    width: 40,
    height: 40,
    backgroundColor: '#ffffff',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subscribedText: {
    color: '#4ade80',
    fontSize: 12,
    fontWeight: '600',
  },
  columnsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 20,
  },
  column: {
    flex: 1,
    gap: 10,
  },
  linkItem: {
    paddingVertical: 3,
  },
  linkText: {
    color: 'rgba(255, 255, 255, 0.55)',
    fontSize: 13,
    fontWeight: '500',
  },
  copyrightRow: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
    paddingTop: 20,
    alignItems: 'center',
  },
  copyrightText: {
    color: 'rgba(255, 255, 255, 0.35)',
    fontSize: 11,
  },
});
