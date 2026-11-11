import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  View,
} from 'react-native';
import { useGoogleAuth } from '../hooks/useGoogleAuth';
import { colors } from '../theme/colors';

interface GoogleSignInButtonProps {
  label?: string;
  onSuccess?: () => void;
  onError?: (err: string) => void;
  disabled?: boolean;
}

export const GoogleSignInButton: React.FC<GoogleSignInButtonProps> = ({
  label = 'Continue with Google',
  onSuccess,
  onError,
  disabled = false,
}) => {
  const {
    handleGoogleAuth,
    isGoogleLoading,
    isGoogleConfigured,
    isGoogleReady,
  } = useGoogleAuth({
    onSuccess,
    onError,
  });

  return (
    <View style={styles.container}>
      <TouchableOpacity
        onPress={handleGoogleAuth}
        disabled={disabled || !isGoogleReady || !isGoogleConfigured || isGoogleLoading}
        style={[
          styles.button,
          (disabled || !isGoogleReady || !isGoogleConfigured) && styles.buttonDisabled,
        ]}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel={label}
      >
        {isGoogleLoading ? (
          <ActivityIndicator color={colors.foreground} />
        ) : (
          <View style={styles.content}>
            <Text style={styles.googleIcon}>G</Text>
            <Text style={styles.buttonText}>{label}</Text>
          </View>
        )}
      </TouchableOpacity>
      {!isGoogleConfigured && (
        <Text style={styles.configNote}>
          Add the Google client ID for this platform to `.env` to enable Google sign-in.
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  button: {
    minHeight: 46,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.glassInputBorder,
    backgroundColor: colors.glassInputBg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  googleIcon: {
    color: '#4285F4',
    fontSize: 18,
    fontWeight: '900',
  },
  buttonText: {
    color: colors.foreground,
    fontSize: 13,
    fontWeight: '700',
  },
  configNote: {
    color: colors.foregroundDim,
    fontSize: 11,
    textAlign: 'center',
    marginTop: 8,
  },
});
