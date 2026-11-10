import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
} from 'react-native';
import { useSellerProfile } from '../hooks/useSellerProfile';
import { useFileUpload } from '@/features/storage/hooks/useFileUpload';
import { useUIStore } from '@/lib/store/uiStore';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/shared/components/Card';
import { Button } from '@/shared/components/Button';
import { Badge } from '@/shared/components/Badge';
import { Input } from '@/shared/components/Input';
import { Dialog } from '@/shared/components/Dialog';
import { Skeleton } from '@/shared/components/Skeleton';
import {
  User,
  Mail,
  Phone,
  Store,
  MapPin,
  Edit3,
  Upload,
  CheckCircle,
} from 'lucide-react-native';
import { Colors } from '@/theme/colors';

interface SellerProfilePageProps {
  navigation: any;
}

export function SellerProfilePage({ navigation }: SellerProfilePageProps) {
  const { profile, isLoading, updateProfile, isUpdating } = useSellerProfile();
  const showToast = useUIStore((s) => s.showToast);
  const { pickAndUpload, isUploading } = useFileUpload({ folder: 'seller-profile' });

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [gstNumber, setGstNumber] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [city, setCity] = useState('');
  const [stateName, setStateName] = useState('');
  const [postalCode, setPostalCode] = useState('');

  const openEdit = () => {
    if (!profile) return;
    setFirstName(profile.seller.firstName || '');
    setLastName(profile.seller.lastName || '');
    setPhone(profile.seller.phone || '');
    setAvatarUrl(profile.seller.avatarUrl || '');
    setBusinessName(profile.shop?.businessName || '');
    setGstNumber(profile.shop?.gstNumber || '');
    setIsEditOpen(true);
  };

  const handleAvatarUpload = async () => {
    const res = await pickAndUpload();
    if (res?.url) {
      setAvatarUrl(res.url);
      showToast('Avatar uploaded', 'success');
    }
  };

  const handleSave = async () => {
    try {
      await updateProfile({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim(),
        avatarUrl,
        businessName: businessName.trim(),
        gstNumber: gstNumber.trim(),
        addressLine1: addressLine1.trim(),
        city: city.trim(),
        state: stateName.trim(),
        postalCode: postalCode.trim(),
      });
      showToast('Profile updated successfully', 'success');
      setIsEditOpen(false);
    } catch (err: any) {
      showToast(err.message || 'Failed to update profile', 'error');
    }
  };

  return (
    <DashboardLayout title="Seller Profile" navigation={navigation} currentRoute="/profile">
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.title}>Seller Profile</Text>
            <Text style={styles.subtitle}>Verified merchant identity &amp; shop status</Text>
          </View>
          <Button
            variant="default"
            size="sm"
            onPress={openEdit}
            icon={<Edit3 size={14} color="#000000" />}
          >
            Edit Profile
          </Button>
        </View>

        {isLoading || !profile ? (
          <View style={{ gap: 12 }}>
            <Skeleton height={120} borderRadius={16} />
            <Skeleton height={140} borderRadius={16} />
          </View>
        ) : (
          <>
            {/* Profile Completion */}
            <Card style={styles.completionCard}>
              <View style={styles.completionRow}>
                <Text style={styles.completionLabel}>Profile Completeness</Text>
                <Text style={styles.completionVal}>{profile.profileCompletion}%</Text>
              </View>
              <View style={styles.progressBarBg}>
                <View style={[styles.progressBarFill, { width: `${profile.profileCompletion}%` }]} />
              </View>
            </Card>

            {/* Seller Account Overview */}
            <Card>
              <CardHeader>
                <CardTitle>Account Details</CardTitle>
              </CardHeader>
              <CardContent style={{ gap: 12 }}>
                <View style={styles.sellerHeaderRow}>
                  <View style={styles.avatarCircle}>
                    {profile.seller.avatarUrl ? (
                      <Image source={{ uri: profile.seller.avatarUrl }} style={{ width: '100%', height: '100%' }} />
                    ) : (
                      <Text style={styles.avatarInitials}>
                        {profile.seller.firstName?.[0]?.toUpperCase() || 'S'}
                      </Text>
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.sellerFullName}>
                      {profile.seller.firstName} {profile.seller.lastName}
                    </Text>
                    <Text style={styles.sellerUsername}>@{profile.seller.username}</Text>
                    <Badge variant="success" style={{ marginTop: 4 }}>
                      {profile.seller.status || 'ACTIVE'}
                    </Badge>
                  </View>
                </View>

                <View style={styles.infoRow}>
                  <Mail size={15} color={Colors.purpleLight} />
                  <Text style={styles.infoText}>{profile.seller.email}</Text>
                </View>

                {profile.seller.phone ? (
                  <View style={styles.infoRow}>
                    <Phone size={15} color={Colors.purpleLight} />
                    <Text style={styles.infoText}>{profile.seller.phone}</Text>
                  </View>
                ) : null}
              </CardContent>
            </Card>

            {/* Shop Standing */}
            <Card>
              <CardHeader>
                <CardTitle>Merchant Storefront</CardTitle>
              </CardHeader>
              <CardContent style={{ gap: 10 }}>
                {profile.shop ? (
                  <>
                    <View style={styles.shopStandingRow}>
                      <Store size={18} color={Colors.purpleLight} />
                      <Text style={styles.shopNameText}>{profile.shop.name}</Text>
                      <Badge variant={profile.shop.status === 'APPROVED' ? 'success' : 'default'}>
                        {profile.shop.status}
                      </Badge>
                    </View>
                    {profile.shop.businessName ? (
                      <Text style={styles.subInfo}>
                        Registered Legal Entity: <Text style={{ color: '#ffffff' }}>{profile.shop.businessName}</Text>
                      </Text>
                    ) : null}
                    {profile.shop.gstNumber ? (
                      <Text style={styles.subInfo}>
                        GSTIN: <Text style={{ color: '#ffffff' }}>{profile.shop.gstNumber}</Text>
                      </Text>
                    ) : null}
                  </>
                ) : (
                  <View style={{ alignItems: 'center', paddingVertical: 10 }}>
                    <Text style={styles.emptyText}>No storefront created yet.</Text>
                    <Button
                      variant="default"
                      size="sm"
                      onPress={() => navigation.navigate('ShopSetup')}
                      style={{ marginTop: 8 }}
                    >
                      Set Up Storefront
                    </Button>
                  </View>
                )}
              </CardContent>
            </Card>
          </>
        )}

        {/* Edit Profile Dialog */}
        <Dialog
          open={isEditOpen}
          onClose={() => setIsEditOpen(false)}
          title="Edit Seller Profile"
          description="Update merchant contact details and tax identity"
        >
          <View style={{ gap: 10 }}>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Input
                  label="First Name"
                  placeholder="First name"
                  value={firstName}
                  onChangeText={setFirstName}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Input
                  label="Last Name"
                  placeholder="Last name"
                  value={lastName}
                  onChangeText={setLastName}
                />
              </View>
            </View>

            <Input
              label="Phone Number"
              placeholder="+91 98765 43210"
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
            />

            <Input
              label="Registered Business Name"
              placeholder="Doe Handicrafts Pvt Ltd"
              value={businessName}
              onChangeText={setBusinessName}
            />

            <Input
              label="GST Number"
              placeholder="22AAAAA0000A1Z5"
              autoCapitalize="characters"
              value={gstNumber}
              onChangeText={setGstNumber}
            />

            <Button
              variant="outline"
              size="sm"
              loading={isUploading}
              onPress={handleAvatarUpload}
              icon={<Upload size={14} color="#ffffff" />}
            >
              Upload Profile Avatar
            </Button>

            <Button
              variant="default"
              loading={isUpdating}
              onPress={handleSave}
              style={{ marginTop: 12 }}
            >
              Save Profile
            </Button>
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
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  completionCard: {
    padding: 14,
    marginBottom: 10,
  },
  completionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  completionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.7)',
  },
  completionVal: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.emerald,
  },
  progressBarBg: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: Colors.emerald,
  },
  sellerHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.04)',
    paddingBottom: 12,
  },
  avatarCircle: {
    height: 52,
    width: 52,
    borderRadius: 26,
    backgroundColor: Colors.purpleBg,
    borderWidth: 1,
    borderColor: Colors.purpleBorder,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    fontSize: 18,
    fontWeight: '800',
    color: '#ffffff',
  },
  sellerFullName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
  },
  sellerUsername: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.45)',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  shopStandingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  shopNameText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
  subInfo: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.5)',
  },
  emptyText: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.4)',
  },
});
