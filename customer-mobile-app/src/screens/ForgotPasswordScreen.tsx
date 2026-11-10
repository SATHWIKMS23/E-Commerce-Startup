import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ArrowLeft, Mail, AlertCircle } from 'lucide-react-native';
import { authService } from '../services/auth.service';
import { BrandLogo } from '../components/BrandLogo';
import { RootStackParamList } from '../navigation/types';
import { colors } from '../theme/colors';

export const ForgotPasswordScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }

    setError(null);
    setIsLoading(true);
    try {
      await authService.forgotPassword(email.trim());
      setSubmitted(true);
    } catch (err: any) {
      setError(err.message || 'Could not send reset link. Please check the email.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Top Nav */}
      <View style={styles.topNav}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft size={20} color={colors.foreground} />
        </TouchableOpacity>
        <BrandLogo fontSize={15} />
        <View style={{ width: 32 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.card}>
          <Text style={styles.title}>Forgot Password</Text>
          <Text style={styles.subtitle}>
            Enter your registered email address and we'll send you recovery instructions.
          </Text>

          {error && (
            <View style={styles.errorBox}>
              <AlertCircle size={16} color={colors.destructive} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {submitted ? (
            <View style={styles.successBox}>
              <Text style={styles.successTitle}>Check Your Inbox</Text>
              <Text style={styles.successText}>
                If an account exists for {email}, a password reset link has been dispatched.
              </Text>

              <TouchableOpacity
                onPress={() => navigation.navigate('Login')}
                style={styles.backToLoginBtn}
              >
                <Text style={styles.backToLoginText}>Back to Sign In</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <Text style={styles.label}>Email Address</Text>
              <View style={styles.inputWrap}>
                <Mail size={16} color={colors.foregroundDim} style={{ marginLeft: 12 }} />
                <TextInput
                  value={email}
                  onChangeText={(t) => { setEmail(t); setError(null); }}
                  placeholder="name@example.com"
                  placeholderTextColor={colors.foregroundDim}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  style={styles.input}
                />
              </View>

              <TouchableOpacity
                onPress={handleSubmit}
                disabled={isLoading}
                style={styles.submitBtn}
                activeOpacity={0.8}
              >
                {isLoading ? (
                  <ActivityIndicator color={colors.primaryForeground} />
                ) : (
                  <Text style={styles.submitBtnText}>Send Reset Instructions</Text>
                )}
              </TouchableOpacity>
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 48,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
    backgroundColor: 'rgba(10, 10, 10, 0.95)',
  },
  backBtn: {
    padding: 6,
  },
  scrollContent: {
    padding: 16,
    paddingTop: 40,
  },
  card: {
    padding: 20,
    borderRadius: 22,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  title: {
    color: colors.foreground,
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'center',
  },
  subtitle: {
    color: colors.foregroundMuted,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 20,
    lineHeight: 18,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
    marginBottom: 16,
  },
  errorText: {
    color: colors.destructive,
    fontSize: 12,
    flex: 1,
  },
  label: {
    color: colors.foregroundMuted,
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    marginBottom: 6,
    marginTop: 12,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: colors.glassInputBg,
    borderWidth: 1,
    borderColor: colors.glassInputBorder,
    height: 46,
  },
  input: {
    flex: 1,
    color: colors.foreground,
    fontSize: 13,
    paddingHorizontal: 10,
    paddingVertical: 0,
  },
  submitBtn: {
    marginTop: 24,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  submitBtnText: {
    color: colors.primaryForeground,
    fontSize: 14,
    fontWeight: '800',
  },
  successBox: {
    padding: 16,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
  },
  successTitle: {
    color: colors.foreground,
    fontSize: 16,
    fontWeight: '800',
  },
  successText: {
    color: colors.foregroundMuted,
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
  backToLoginBtn: {
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: colors.primary,
  },
  backToLoginText: {
    color: colors.primaryForeground,
    fontSize: 12,
    fontWeight: '800',
  },
});
