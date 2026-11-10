import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useAuth } from '../hooks/useAuth';
import { authService } from '../services/authService';
import { Button } from '@/shared/components/Button';
import { Card } from '@/shared/components/Card';
import { Store, ShieldAlert, ArrowRight } from 'lucide-react-native';
import { GoogleButton } from './GoogleButton';
import { Colors } from '@/theme/colors';

interface LoginPageProps {
  navigation: any;
}

export function LoginPage({ navigation }: LoginPageProps) {
  const { login, isLoggingIn } = useAuth();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const onSubmit = async () => {
    setErrorMsg(null);
    const validation = authService.validateLogin({ identifier, password });
    if (!validation.valid) {
      setErrorMsg(validation.error || 'Please fill in credentials');
      return;
    }

    try {
      await login({ identifier: identifier.trim(), password });
    } catch (err: any) {
      setErrorMsg(authService.formatError(err));
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Soft background ambient glow (matching web) */}
        <View style={styles.glowTopLeft} pointerEvents="none" />
        <View style={styles.glowBottomRight} pointerEvents="none" />

        {/* Portal Header - Fixed & Stable */}
        <View style={styles.header}>
          <View style={styles.logoBox}>
            <Store size={24} color="#a855f7" />
          </View>
          <Text style={styles.portalTitle}>Seller Portal</Text>
          <Text style={styles.portalTagline}>
            MANAGE YOUR STOREFRONT, PRODUCTS, AND INCOMING ORDERS.
          </Text>
        </View>

        {/* Main Sign In Card */}
        <Card style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Sign In</Text>
            <Text style={styles.cardDescription}>
              Enter your email and password to access your dashboard
            </Text>
          </View>

          {errorMsg ? (
            <View style={styles.errorBanner}>
              <ShieldAlert size={15} color={Colors.rose} style={{ marginRight: 8 }} />
              <Text style={styles.errorBannerText}>{errorMsg}</Text>
            </View>
          ) : null}

          {/* Email or Username */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Email or Username</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Email or Username"
              placeholderTextColor="rgba(255, 255, 255, 0.25)"
              autoCapitalize="none"
              autoCorrect={false}
              value={identifier}
              onChangeText={setIdentifier}
            />
          </View>

          {/* Password with Forgot Password link in header row */}
          <View style={styles.inputGroup}>
            <View style={styles.passwordLabelRow}>
              <Text style={styles.inputLabel}>Password</Text>
              <TouchableOpacity
                onPress={() => navigation.navigate('ForgotPassword')}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={styles.forgotText}>Forgot Password?</Text>
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.textInput}
              placeholder="••••••••"
              placeholderTextColor="rgba(255, 255, 255, 0.25)"
              secureTextEntry
              autoCapitalize="none"
              value={password}
              onChangeText={setPassword}
            />
          </View>

          {/* Gradient Submit Button */}
          <Button
            variant="default"
            loading={isLoggingIn}
            onPress={onSubmit}
            style={styles.submitBtn}
          >
            <View style={styles.btnContent}>
              <Text style={styles.btnText}>Sign In with Email</Text>
              <ArrowRight size={15} color="#ffffff" style={{ marginLeft: 8 }} />
            </View>
          </Button>

          {/* OR Divider */}
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Google Sign In */}
          <GoogleButton
            label="Continue with Google"
            onError={(msg) => setErrorMsg(msg)}
          />

          {/* Card Footer Link */}
          <View style={styles.footerRow}>
            <Text style={styles.footerText}>Don&apos;t have a seller account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Register')}>
              <Text style={styles.footerLink}>Create one now</Text>
            </TouchableOpacity>
          </View>
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#07070a',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 36,
  },
  glowTopLeft: {
    position: 'absolute',
    top: -80,
    left: -80,
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: 'rgba(168, 85, 247, 0.08)',
  },
  glowBottomRight: {
    position: 'absolute',
    bottom: -80,
    right: -80,
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: 'rgba(99, 102, 241, 0.06)',
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoBox: {
    height: 48,
    width: 48,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  portalTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: -0.3,
  },
  portalTagline: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.4)',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginTop: 4,
    textAlign: 'center',
  },
  card: {
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: 20,
    padding: 22,
    maxWidth: 420,
    width: '100%',
    alignSelf: 'center',
  },
  cardHeader: {
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.45)',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(244, 63, 94, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(244, 63, 94, 0.25)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
  },
  errorBannerText: {
    flex: 1,
    fontSize: 12,
    color: Colors.rose,
    fontWeight: '500',
  },
  inputGroup: {
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.65)',
    marginBottom: 6,
    marginLeft: 2,
  },
  passwordLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
    paddingHorizontal: 2,
  },
  forgotText: {
    fontSize: 11,
    color: '#a855f7',
    fontWeight: '600',
  },
  textInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    height: 44,
    paddingHorizontal: 14,
    color: '#ffffff',
    fontSize: 13,
  },
  submitBtn: {
    height: 44,
    borderRadius: 12,
    marginTop: 4,
    marginBottom: 12,
  },
  btnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 14,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  dividerText: {
    fontSize: 10,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.3)',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginHorizontal: 12,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 18,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  footerText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.45)',
  },
  footerLink: {
    fontSize: 12,
    color: '#a855f7',
    fontWeight: '700',
  },
});
