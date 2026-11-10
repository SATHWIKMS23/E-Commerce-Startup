import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useConfirmStore } from '@/lib/store/confirmStore';
import { useUIStore } from '@/lib/store/uiStore';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/shared/components/Card';
import { Button } from '@/shared/components/Button';
import { Input } from '@/shared/components/Input';
import { CheckCircle, AlertTriangle, UserMinus } from 'lucide-react-native';
import { Colors } from '@/theme/colors';

interface SettingsPageProps {
  navigation: any;
}

export function SettingsPage({ navigation }: SettingsPageProps) {
  const { user, updateProfile, isUpdatingProfile, deactivateAccount, isDeactivating } = useAuth();
  const showConfirm = useConfirmStore((s) => s.showConfirm);
  const showToast = useUIStore((s) => s.showToast);

  const [firstName, setFirstName] = useState(user?.firstName || '');
  const [lastName, setLastName] = useState(user?.lastName || '');
  const [username, setUsername] = useState(user?.username || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSave = async () => {
    if (!firstName.trim()) {
      showToast('First name is required', 'error');
      return;
    }
    setSuccessMsg(null);
    try {
      await updateProfile({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        username: username.trim(),
        phone: phone.trim(),
      });
      setSuccessMsg('Personal profile details saved successfully.');
      showToast('Profile updated', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to update profile', 'error');
    }
  };

  const handleDeactivate = () => {
    showConfirm({
      title: 'Deactivate Seller Account',
      message:
        'WARNING: Deactivating will temporarily unlist all items and log you out. You have 30 days to log back in to reverse deletion. Proceed?',
      confirmText: 'Deactivate',
      onConfirm: async () => {
        try {
          await deactivateAccount();
          showToast('Account deactivated', 'info');
        } catch (err: any) {
          showToast(err.message || 'Failed to deactivate account', 'error');
        }
      },
    });
  };

  return (
    <DashboardLayout title="Settings" navigation={navigation} currentRoute="/settings">
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Account Settings</Text>
          <Text style={styles.subtitle}>Configure your personal seller identity and account options.</Text>
        </View>

        {successMsg && (
          <View style={styles.successBanner}>
            <CheckCircle size={16} color={Colors.emerald} style={{ marginRight: 8 }} />
            <Text style={styles.successText}>{successMsg}</Text>
          </View>
        )}

        {/* Profile Card */}
        <Card>
          <CardHeader>
            <CardTitle>Personal Profile</CardTitle>
            <CardDescription>Update your personal account credentials</CardDescription>
          </CardHeader>
          <CardContent style={{ gap: 6 }}>
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
              label="Username"
              placeholder="Username"
              autoCapitalize="none"
              value={username}
              onChangeText={setUsername}
            />

            <Input
              label="Phone Number"
              placeholder="+91 98765 43210"
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
            />

            <Button
              variant="default"
              loading={isUpdatingProfile}
              onPress={handleSave}
              style={{ marginTop: 8 }}
            >
              Save Profile Changes
            </Button>
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card style={styles.dangerCard}>
          <CardHeader>
            <CardTitle style={{ color: Colors.rose }}>Danger Zone</CardTitle>
            <CardDescription>Deactivate or close your seller account</CardDescription>
          </CardHeader>
          <CardContent>
            <Text style={styles.dangerDesc}>
              Deactivating your merchant portal will pause incoming orders and hide all active product listings across the marketplace.
            </Text>
            <Button
              variant="destructive"
              loading={isDeactivating}
              onPress={handleDeactivate}
              style={{ marginTop: 12 }}
              icon={<UserMinus size={16} color="#ffffff" />}
            >
              Deactivate Account
            </Button>
          </CardContent>
        </Card>
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
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderWidth: 1,
    borderColor: Colors.emeraldBorder,
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
  },
  successText: {
    fontSize: 12,
    color: Colors.emerald,
    fontWeight: '600',
  },
  dangerCard: {
    borderColor: 'rgba(244, 63, 94, 0.25)',
    backgroundColor: 'rgba(244, 63, 94, 0.04)',
    marginTop: 8,
  },
  dangerDesc: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.6)',
    lineHeight: 16,
  },
});
