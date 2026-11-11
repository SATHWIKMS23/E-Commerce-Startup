import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Mail, Lock, Eye, EyeOff, AlertCircle, ArrowLeft } from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { useBranding } from '../context/BrandingContext';
import { BrandLogo } from '../components/BrandLogo';
import { GoogleSignInButton } from '../components/GoogleSignInButton';
import { RootStackParamList } from '../navigation/types';
import { colors } from '../theme/colors';

export const LoginScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { login } = useAuth();
  const { branding } = useBranding();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    if (!identifier.trim() || !password.trim()) {
      setError('Please enter your email/username and password');
      return;
    }

    setError(null);
    setIsLoading(true);
    try {
      await login(identifier.trim(), password.trim());
      navigation.goBack();
    } catch (err: any) {
      setError(err.message || 'Invalid login credentials. Please try again.');
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

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.card}>
          <Text style={styles.title}>Welcome back</Text>
          <Text style={styles.subtitle}>
            Sign in to your {branding.name || 'AtlasBasket'} account
          </Text>

          {error && (
            <View style={styles.errorBox}>
              <AlertCircle size={16} color={colors.destructive} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Email / Username */}
          <Text style={styles.label}>Email or Username</Text>
          <View style={styles.inputWrap}>
            <Mail size={16} color={colors.foregroundDim} style={{ marginLeft: 12 }} />
            <TextInput
              value={identifier}
              onChangeText={(t) => { setIdentifier(t); setError(null); }}
              placeholder="Email or Username"
              placeholderTextColor={colors.foregroundDim}
              style={styles.input}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          {/* Password */}
          <View style={styles.labelRow}>
            <Text style={styles.label}>Password</Text>
            <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')}>
              <Text style={styles.forgotText}>Forgot password?</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.inputWrap}>
            <Lock size={16} color={colors.foregroundDim} style={{ marginLeft: 12 }} />
            <TextInput
              value={password}
              onChangeText={(t) => { setPassword(t); setError(null); }}
              placeholder="••••••••"
              placeholderTextColor={colors.foregroundDim}
              secureTextEntry={!showPassword}
              style={styles.input}
            />
            <TouchableOpacity
              onPress={() => setShowPassword(!showPassword)}
              style={styles.eyeBtn}
            >
              {showPassword ? (
                <EyeOff size={16} color={colors.foregroundMuted} />
              ) : (
                <Eye size={16} color={colors.foregroundMuted} />
              )}
            </TouchableOpacity>
          </View>

          {/* Submit */}
          <TouchableOpacity
            onPress={handleLogin}
            disabled={isLoading}
            style={styles.submitBtn}
            activeOpacity={0.8}
          >
            {isLoading ? (
              <ActivityIndicator color={colors.primaryForeground} />
            ) : (
              <Text style={styles.submitBtnText}>Sign In</Text>
            )}
          </TouchableOpacity>

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.dividerLine} />
          </View>

          <View style={styles.googleBtnWrap}>
            <GoogleSignInButton
              label="Continue with Google"
              onSuccess={() => navigation.goBack()}
              onError={setError}
              disabled={isLoading}
            />
          </View>

          {/* Switch to Signup */}
          <View style={styles.switchRow}>
            <Text style={styles.switchText}>Don&apos;t have an account?</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Signup')}>
              <Text style={styles.switchLink}>Sign Up</Text>
            </TouchableOpacity>
          </View>
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
    paddingTop: 32,
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
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  forgotText: {
    color: colors.foregroundDim,
    fontSize: 11,
    fontWeight: '600',
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
  eyeBtn: {
    padding: 12,
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
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 18,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.cardBorder,
  },
  dividerText: {
    color: colors.foregroundDim,
    fontSize: 10,
    fontWeight: '700',
  },
  googleBtnWrap: {
    marginTop: 16,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: 18,
  },
  switchText: {
    color: colors.foregroundMuted,
    fontSize: 12,
  },
  switchLink: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '800',
  },
});
