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
import { authApi } from '../api/authApi';
import { authService } from '../services/authService';
import { Button } from '@/shared/components/Button';
import { Card } from '@/shared/components/Card';
import { Store, ArrowLeft, ArrowRight, CheckCircle2, KeyRound, ShieldAlert } from 'lucide-react-native';
import { Colors } from '@/theme/colors';

interface ForgotPasswordPageProps {
  navigation: any;
}

export function ForgotPasswordPage({ navigation }: ForgotPasswordPageProps) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [identifier, setIdentifier] = useState('');
  const [otp, setOtp] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleRequestOtp = async () => {
    if (!identifier.trim()) {
      setErrorMsg('Please enter your email or username');
      return;
    }
    setErrorMsg(null);
    setLoading(true);
    try {
      await authApi.forgotPassword({ identifier: identifier.trim() });
      setStep(2);
    } catch (err: any) {
      setErrorMsg(authService.formatError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp.trim() || otp.trim().length !== 6) {
      setErrorMsg('OTP must be exactly 6 digits');
      return;
    }
    setErrorMsg(null);
    setLoading(true);
    try {
      const res = await authApi.verifyOtp({ identifier: identifier.trim(), otp: otp.trim() });
      setResetToken(res.resetToken);
      setStep(3);
    } catch (err: any) {
      setErrorMsg(authService.formatError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (newPassword.length < 6) {
      setErrorMsg('Password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMsg("Passwords don't match");
      return;
    }
    setErrorMsg(null);
    setLoading(true);
    try {
      await authApi.resetPassword({ resetToken, newPassword });
      setStep(4);
    } catch (err: any) {
      setErrorMsg(authService.formatError(err));
    } finally {
      setLoading(false);
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
        <View style={styles.glowTop} pointerEvents="none" />

        {/* Portal Header - Fixed & Stable */}
        <View style={styles.header}>
          <View style={styles.logoBox}>
            <Store size={24} color="#a855f7" />
          </View>
          <Text style={styles.portalTitle}>Seller Portal</Text>
          <Text style={styles.portalTagline}>Password Recovery Wizard</Text>
        </View>

        <Card style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.titleRow}>
              <KeyRound size={20} color="#a855f7" style={{ marginRight: 8 }} />
              <Text style={styles.cardTitle}>
                {step === 1 && 'Request Password Reset'}
                {step === 2 && 'Verify OTP Code'}
                {step === 3 && 'Create New Password'}
                {step === 4 && 'Password Updated!'}
              </Text>
            </View>
            <Text style={styles.cardDescription}>
              {step === 1 && 'Enter your username or email address to receive a 6-digit verification code.'}
              {step === 2 && `Enter the 6-digit code sent for "${identifier}".`}
              {step === 3 && 'Specify a new secure password for your seller portal account.'}
              {step === 4 && 'Your password has been successfully updated.'}
            </Text>
          </View>

          {errorMsg ? (
            <View style={styles.errorBanner}>
              <ShieldAlert size={15} color={Colors.rose} style={{ marginRight: 8 }} />
              <Text style={styles.errorBannerText}>{errorMsg}</Text>
            </View>
          ) : null}

          {step === 1 && (
            <View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Email or Username</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Enter your email or username"
                  placeholderTextColor="rgba(255, 255, 255, 0.25)"
                  value={identifier}
                  onChangeText={setIdentifier}
                  autoCapitalize="none"
                />
              </View>
              <Button
                variant="default"
                loading={loading}
                onPress={handleRequestOtp}
                style={styles.submitBtn}
              >
                <View style={styles.btnContent}>
                  <Text style={styles.btnText}>Send verification code</Text>
                  <ArrowRight size={15} color="#ffffff" style={{ marginLeft: 8 }} />
                </View>
              </Button>
            </View>
          )}

          {step === 2 && (
            <View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>6-Digit Verification Code (OTP)</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. 123456"
                  placeholderTextColor="rgba(255, 255, 255, 0.25)"
                  keyboardType="number-pad"
                  maxLength={6}
                  value={otp}
                  onChangeText={setOtp}
                />
              </View>
              <Button
                variant="default"
                loading={loading}
                onPress={handleVerifyOtp}
                style={styles.submitBtn}
              >
                <View style={styles.btnContent}>
                  <Text style={styles.btnText}>Verify code</Text>
                  <ArrowRight size={15} color="#ffffff" style={{ marginLeft: 8 }} />
                </View>
              </Button>
            </View>
          )}

          {step === 3 && (
            <View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>New Password</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Minimum 6 characters"
                  placeholderTextColor="rgba(255, 255, 255, 0.25)"
                  secureTextEntry
                  value={newPassword}
                  onChangeText={setNewPassword}
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Confirm Password</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Re-type your password"
                  placeholderTextColor="rgba(255, 255, 255, 0.25)"
                  secureTextEntry
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                />
              </View>
              <Button
                variant="default"
                loading={loading}
                onPress={handleResetPassword}
                style={styles.submitBtn}
              >
                <View style={styles.btnContent}>
                  <Text style={styles.btnText}>Reset password</Text>
                  <ArrowRight size={15} color="#ffffff" style={{ marginLeft: 8 }} />
                </View>
              </Button>
            </View>
          )}

          {step === 4 && (
            <View style={styles.successBox}>
              <View style={styles.successIcon}>
                <CheckCircle2 size={36} color={Colors.emerald} />
              </View>
              <Text style={styles.successTitle}>Password Updated Successfully!</Text>
              <Text style={styles.successDesc}>You can now sign in with your new password.</Text>
              <Button
                variant="default"
                onPress={() => navigation.navigate('Login')}
                style={{ width: '100%', marginTop: 16 }}
              >
                Proceed to Sign In
              </Button>
            </View>
          )}

          {/* Footer Back Link */}
          <View style={styles.footerRow}>
            <TouchableOpacity
              onPress={() => (step > 1 && step < 4 ? setStep((step - 1) as any) : navigation.navigate('Login'))}
              style={styles.backLink}
            >
              <ArrowLeft size={14} color="#a855f7" style={{ marginRight: 6 }} />
              <Text style={styles.backLinkText}>Back to login</Text>
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
  glowTop: {
    position: 'absolute',
    top: -80,
    alignSelf: 'center',
    width: 360,
    height: 360,
    borderRadius: 180,
    backgroundColor: 'rgba(168, 85, 247, 0.08)',
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
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
  },
  cardDescription: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.45)',
    lineHeight: 16,
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
    marginTop: 6,
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
  successBox: {
    alignItems: 'center',
    paddingVertical: 14,
  },
  successIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  successTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 4,
  },
  successDesc: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.5)',
    textAlign: 'center',
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
  backLink: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backLinkText: {
    fontSize: 12,
    color: '#a855f7',
    fontWeight: '600',
  },
});
