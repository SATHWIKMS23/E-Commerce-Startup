import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Switch,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useShop } from '../hooks/useShop';
import { shopApi } from '../api/shopApi';
import { shopService } from '../services/shopService';
import { useLocationStore } from '@/lib/store/locationStore';
import { useUIStore } from '@/lib/store/uiStore';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/shared/components/Card';
import { Button } from '@/shared/components/Button';
import { Input } from '@/shared/components/Input';
import { Dialog } from '@/shared/components/Dialog';
import { Store, ChevronDown, Check } from 'lucide-react-native';
import { Colors } from '@/theme/colors';

interface ShopSetupPageProps {
  navigation: any;
}

export function ShopSetupPage({ navigation }: ShopSetupPageProps) {
  const { createShop, isCreatingShop } = useShop();
  const showToast = useUIStore((s) => s.showToast);
  const setComingSoon = useLocationStore((s) => s.setComingSoon);

  const [shopName, setShopName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [phone, setPhone] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [gstRegistered, setGstRegistered] = useState(false);
  const [gstNumber, setGstNumber] = useState('');

  // Location config
  const [selectedState, setSelectedState] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [stateModalOpen, setStateModalOpen] = useState(false);
  const [cityModalOpen, setCityModalOpen] = useState(false);

  const { data: locationsConfig } = useQuery({
    queryKey: ['locations-config'],
    queryFn: shopApi.getLocationsStates,
    staleTime: 10 * 60 * 1000,
  });

  const allStates = locationsConfig?.allStates ?? [];
  const districtRequired = locationsConfig?.districtRequired !== false;

  const { data: districtsData } = useQuery({
    queryKey: ['locations-districts', selectedState],
    queryFn: () => shopApi.getLocationsDistricts(selectedState),
    enabled: !!selectedState,
    staleTime: 10 * 60 * 1000,
  });

  const districts = districtsData?.allDistricts ?? [];

  const handleNameChange = (val: string) => {
    setShopName(val);
    const autoSlug = val
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    setSlug(autoSlug);
  };

  const handleSelectState = (st: { name: string; isEnabled: boolean }) => {
    setStateModalOpen(false);
    if (!st.isEnabled) {
      setComingSoon(true, st.name);
      return;
    }
    setSelectedState(st.name);
    setSelectedCity('');
  };

  const handleSelectCity = (d: { name: string; isEnabled: boolean }) => {
    setCityModalOpen(false);
    if (!d.isEnabled) {
      setComingSoon(true, selectedState, d.name);
      return;
    }
    setSelectedCity(d.name);
  };

  const handleSubmit = async () => {
    const validation = shopService.validateShopSetup(
      {
        shopName,
        slug,
        description,
        phone,
        addressLine1,
        addressLine2,
        city: selectedCity,
        state: selectedState,
        postalCode,
        country: 'India',
      },
      districtRequired
    );

    if (!validation.valid) {
      showToast(validation.error || 'Please fill in required fields', 'error');
      return;
    }

    try {
      await createShop({
        shopName: shopName.trim(),
        slug: slug.trim(),
        description: description.trim(),
        phone: phone.trim(),
        addressLine1: addressLine1.trim(),
        addressLine2: addressLine2.trim() || undefined,
        city: selectedCity.trim(),
        state: selectedState.trim(),
        postalCode: postalCode.trim(),
        country: 'India',
        gstRegistered,
        gstNumber: gstRegistered ? gstNumber.trim() : undefined,
      });
      showToast('Storefront created successfully! Awaiting approval.', 'success');
      navigation.navigate('Dashboard');
    } catch (err: any) {
      showToast(err.message || 'Failed to create storefront', 'error');
    }
  };

  return (
    <DashboardLayout title="Create Shop" navigation={navigation} currentRoute="/shop">
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Create Store Profile</Text>
          <Text style={styles.subtitle}>Configure your merchant storefront and dispatch location</Text>
        </View>

        <Card>
          <CardHeader>
            <View style={styles.cardHeaderIcon}>
              <Store size={18} color={Colors.purpleLight} />
              <CardTitle>Store Identity</CardTitle>
            </View>
            <CardDescription>Public name, slug, and description</CardDescription>
          </CardHeader>
          <CardContent style={{ gap: 8 }}>
            <Input
              label="Store Name"
              placeholder="e.g. Artisans Studio"
              value={shopName}
              onChangeText={handleNameChange}
            />
            <Input
              label="Store Handle / Slug"
              placeholder="artisans-studio"
              autoCapitalize="none"
              value={slug}
              onChangeText={setSlug}
            />
            <Input
              label="Store Description"
              placeholder="Tell buyers about your handmade crafts, prints, and specialty goods…"
              multiline
              numberOfLines={3}
              value={description}
              onChangeText={setDescription}
            />
            <Input
              label="Contact Phone"
              placeholder="+91 98765 43210"
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
            />
          </CardContent>
        </Card>

        {/* Pickup Dispatch Address */}
        <Card>
          <CardHeader>
            <CardTitle>Pickup Dispatch Address</CardTitle>
            <CardDescription>Address where platform couriers collect shipments</CardDescription>
          </CardHeader>
          <CardContent style={{ gap: 8 }}>
            <Input
              label="Address Line 1"
              placeholder="Shop No, Building Name, Street"
              value={addressLine1}
              onChangeText={setAddressLine1}
            />
            <Input
              label="Address Line 2 (Optional)"
              placeholder="Landmark, Area"
              value={addressLine2}
              onChangeText={setAddressLine2}
            />

            {/* State Picker Button */}
            <Text style={styles.inputLabel}>State / Region</Text>
            <TouchableOpacity
              onPress={() => setStateModalOpen(true)}
              style={styles.pickerBtn}
            >
              <Text style={selectedState ? styles.pickerBtnText : styles.pickerBtnPlaceholder}>
                {selectedState || 'Select State'}
              </Text>
              <ChevronDown size={16} color="rgba(255, 255, 255, 0.5)" />
            </TouchableOpacity>

            {/* District Picker Button */}
            <Text style={styles.inputLabel}>City / District</Text>
            <TouchableOpacity
              onPress={() => {
                if (!selectedState) {
                  showToast('Please select state first', 'error');
                  return;
                }
                setCityModalOpen(true);
              }}
              style={styles.pickerBtn}
            >
              <Text style={selectedCity ? styles.pickerBtnText : styles.pickerBtnPlaceholder}>
                {selectedCity || 'Select District'}
              </Text>
              <ChevronDown size={16} color="rgba(255, 255, 255, 0.5)" />
            </TouchableOpacity>

            <Input
              label="Postal Code (PIN)"
              placeholder="560001"
              keyboardType="number-pad"
              value={postalCode}
              onChangeText={setPostalCode}
            />
          </CardContent>
        </Card>

        {/* GST Registration */}
        <Card>
          <CardHeader>
            <CardTitle>GST Registration</CardTitle>
          </CardHeader>
          <CardContent style={{ gap: 10 }}>
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Are you GST Registered?</Text>
              <Switch
                value={gstRegistered}
                onValueChange={setGstRegistered}
                trackColor={{ false: 'rgba(255,255,255,0.1)', true: Colors.purple }}
                thumbColor="#ffffff"
              />
            </View>
            {gstRegistered && (
              <Input
                label="GSTIN Number"
                placeholder="22AAAAA0000A1Z5"
                autoCapitalize="characters"
                value={gstNumber}
                onChangeText={setGstNumber}
              />
            )}
          </CardContent>
        </Card>

        <Button
          variant="default"
          loading={isCreatingShop}
          onPress={handleSubmit}
          style={{ marginBottom: 24 }}
        >
          Submit Store Application
        </Button>

        {/* State Modal */}
        <Dialog
          open={stateModalOpen}
          onClose={() => setStateModalOpen(false)}
          title="Select State"
        >
          <View style={{ gap: 6 }}>
            {allStates.map((st) => (
              <TouchableOpacity
                key={st.id}
                onPress={() => handleSelectState(st)}
                style={styles.dropdownItem}
              >
                <Text style={styles.dropdownItemText}>{st.name}</Text>
                {!st.isEnabled && (
                  <Text style={styles.comingSoonTag}>Coming Soon</Text>
                )}
                {selectedState === st.name && <Check size={16} color={Colors.purpleLight} />}
              </TouchableOpacity>
            ))}
          </View>
        </Dialog>

        {/* City Modal */}
        <Dialog
          open={cityModalOpen}
          onClose={() => setCityModalOpen(false)}
          title={`Select District in ${selectedState}`}
        >
          <View style={{ gap: 6 }}>
            {districts.map((d) => (
              <TouchableOpacity
                key={d.id}
                onPress={() => handleSelectCity(d)}
                style={styles.dropdownItem}
              >
                <Text style={styles.dropdownItemText}>{d.name}</Text>
                {!d.isEnabled && (
                  <Text style={styles.comingSoonTag}>Coming Soon</Text>
                )}
                {selectedCity === d.name && <Check size={16} color={Colors.purpleLight} />}
              </TouchableOpacity>
            ))}
          </View>
        </Dialog>
      </ScrollView>
    </DashboardLayout>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#ffffff',
  },
  subtitle: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.45)',
    marginTop: 2,
  },
  cardHeaderIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 4,
    marginLeft: 2,
  },
  pickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: Colors.borderLight,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    marginBottom: 12,
  },
  pickerBtnText: {
    fontSize: 13,
    color: '#ffffff',
  },
  pickerBtnPlaceholder: {
    fontSize: 13,
    color: Colors.textFaint,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  switchLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.85)',
    fontWeight: '600',
  },
  dropdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.04)',
  },
  dropdownItemText: {
    fontSize: 13,
    color: '#ffffff',
  },
  comingSoonTag: {
    fontSize: 9,
    fontWeight: '700',
    color: Colors.yellow,
    backgroundColor: Colors.yellowBg,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
});
