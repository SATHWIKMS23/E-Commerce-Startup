import React, { useEffect, useRef, useState } from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  View,
  Platform,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import * as AuthSession from 'expo-auth-session';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { useAuth } from '../hooks/useAuth';

WebBrowser.maybeCompleteAuthSession();

const googleWebClientId =
  process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim() ||
  process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID?.trim() ||
  '';
const googleIosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID?.trim() || '';
const googleAndroidClientId = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID?.trim() || '';
const googleClientIdFallback = 'missing-google-client-id';

// Target client ID for the current platform
const effectiveClientId =
  (Platform.OS === 'android' ? googleAndroidClientId : null) ||
  (Platform.OS === 'ios' ? googleIosClientId : null) ||
  googleWebClientId ||
  '';

interface GoogleButtonProps {
  label?: string;
  onError?: (msg: string) => void;
  onSuccess?: () => void;
  disabled?: boolean;
}

export function GoogleButton({
  label = 'Continue with Google',
  onError,
  onSuccess,
  disabled = false,
}: GoogleButtonProps) {
  const { googleLogin } = useAuth();
  const [loading, setLoading] = useState(false);

  const redirectUri = AuthSession.makeRedirectUri({
    scheme: 'atlasbasket-seller',
    path: 'oauthredirect',
  });

  const [googleRequest, googleResponse, promptGoogleAsync] = Google.useIdTokenAuthRequest({
    webClientId: googleWebClientId || googleClientIdFallback,
    iosClientId: googleIosClientId || googleClientIdFallback,
    androidClientId: googleAndroidClientId || googleClientIdFallback,
    clientId: effectiveClientId || googleClientIdFallback,
    scopes: ['openid', 'profile', 'email'],
    redirectUri,
  });

  const isGoogleConfigured = !!(
    googleWebClientId ||
    (Platform.OS === 'android' && googleAndroidClientId) ||
    (Platform.OS === 'ios' && googleIosClientId)
  );

  const googleLoginPending = useRef(false);
  const lastGoogleResponse = useRef(googleResponse);

  useEffect(() => {
    if (
      !googleLoginPending.current ||
      !googleResponse ||
      googleResponse === lastGoogleResponse.current
    ) {
      return;
    }

    lastGoogleResponse.current = googleResponse;

    if (googleResponse.type === 'cancel' || googleResponse.type === 'dismiss') {
      googleLoginPending.current = false;
      setLoading(false);
      return;
    }

    if (googleResponse.type !== 'success') {
      googleLoginPending.current = false;
      setLoading(false);
      if (googleResponse.type === 'error') {
        const msg =
          googleResponse.error?.description ||
          (googleResponse.error as any)?.message ||
          'Google sign-in was cancelled or failed.';
        onError?.(msg);
      }
      return;
    }

    void (async () => {
      try {
        let idToken =
          googleResponse.params?.id_token ||
          (googleResponse as any).authentication?.idToken;

        // If Google returned an authorization code instead of direct id_token
        // (the standard PKCE flow for mobile apps via expo-auth-session)
        if (!idToken && googleResponse.params?.code && googleRequest) {
          const tokenResult = await AuthSession.exchangeCodeAsync(
            {
              clientId: effectiveClientId || googleWebClientId,
              code: googleResponse.params.code,
              redirectUri: googleRequest.redirectUri,
              extraParams: googleRequest.codeVerifier
                ? { code_verifier: googleRequest.codeVerifier }
                : undefined,
            },
            Google.discovery
          );
          idToken = tokenResult.idToken;
        }

        if (!idToken) {
          throw new Error('Google did not return an ID token. Please try again.');
        }

        googleLoginPending.current = false;
        await googleLogin(idToken);
        onSuccess?.();
      } catch (err: any) {
        googleLoginPending.current = false;
        const msg = err.message || 'Google sign-in failed. Please try again.';
        onError?.(msg);
      } finally {
        setLoading(false);
      }
    })();
  }, [googleResponse, googleRequest, googleLogin, onError, onSuccess]);

  const handleLogin = async () => {
    if (!isGoogleConfigured || !googleRequest) {
      onError?.(
        'Google sign-in is not configured. Add the Google client IDs to .env to enable Google sign-in.'
      );
      return;
    }

    setLoading(true);
    googleLoginPending.current = true;
    lastGoogleResponse.current = googleResponse;

    try {
      const result = await promptGoogleAsync();
      if (result.type === 'error') {
        throw new Error(
          result.error?.description ||
            (result.error as any)?.message ||
            'Google sign-in failed. Please try again.'
        );
      }
      if (result.type !== 'success') {
        googleLoginPending.current = false;
        setLoading(false);
      }
    } catch (err: any) {
      googleLoginPending.current = false;
      const msg = err.message || 'Google sign-in failed. Please try again.';
      onError?.(msg);
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        onPress={handleLogin}
        disabled={disabled || loading || !googleRequest || !isGoogleConfigured}
        activeOpacity={0.8}
        style={[
          styles.button,
          (disabled || !googleRequest || !isGoogleConfigured) && styles.buttonDisabled,
        ]}
      >
        {loading ? (
          <ActivityIndicator size="small" color="#ffffff" />
        ) : (
          <View style={styles.content}>
            <Svg width={16} height={16} viewBox="0 0 24 24" style={styles.icon}>
              <Path
                fill="#EA4335"
                d="M12.24 10.285V14.4h6.887c-.275 1.565-1.88 4.604-6.887 4.604-4.33 0-7.859-3.578-7.859-8s3.53-8 7.859-8c2.46 0 4.105 1.025 5.047 1.926l3.227-3.107C18.29 1.94 15.5 1 12.24 1 6.033 1 1 6.033 1 12.24s5.033 11.24 11.24 11.24c6.478 0 10.793-4.537 10.793-10.985 0-.74-.08-1.305-.178-1.785H12.24z"
              />
            </Svg>
            <Text style={styles.text}>{label}</Text>
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
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  button: {
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    marginRight: 10,
  },
  text: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.85)',
  },
  configNote: {
    color: 'rgba(255, 255, 255, 0.35)',
    fontSize: 11,
    textAlign: 'center',
    marginTop: 8,
  },
});
