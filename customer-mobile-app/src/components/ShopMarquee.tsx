import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Store } from 'lucide-react-native';
import { shopService, Shop } from '../services/shop.service';
import { RootStackParamList } from '../navigation/types';

const INITIAL_SHOPS: Shop[] = [
  { id: 'cmrek8jw7001rcn21mhcpm3gb', name: 'Tester-Shop', slug: 'shoper' },
];

export const ShopMarquee: React.FC = () => {
  const [shops, setShops] = useState<Shop[]>(INITIAL_SHOPS);
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  useEffect(() => {
    shopService.getFeaturedShops(24).then((data) => {
      if (data.shops && data.shops.length > 0) {
        setShops(data.shops);
      }
    });
  }, []);

  const marqueeList = shops.length > 0 ? [...shops, ...shops, ...shops] : [];

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {marqueeList.map((shop, i) => (
          <TouchableOpacity
            key={`${shop.id}-${i}`}
            onPress={() => navigation.navigate('ShopDetail', { shopId: shop.slug || shop.id })}
            style={styles.chip}
            activeOpacity={0.7}
          >
            <Store size={10} color="rgba(255, 255, 255, 0.3)" />
            <Text style={styles.shopName} numberOfLines={1}>
              {shop.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    backgroundColor: 'rgba(255, 255, 255, 0.015)',
    paddingVertical: 5,
  },
  scrollContent: {
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 14,
  },
  shopName: {
    color: 'rgba(255, 255, 255, 0.45)',
    fontSize: 11,
    fontWeight: '500',
  },
});
