import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import * as AuthSession from 'expo-auth-session';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { useAuth } from '../context/AuthContext';

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

export interface UseGoogleAuthOptions {
  onSuccess?: () => void;
  onError?: (errorMessage: string) => void;
}

export function useGoogleAuth(options?: UseGoogleAuthOptions) {
  const { googleLogin } = useAuth();
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [googleError, setGoogleError] = useState<string | null>(null);

  const redirectUri = AuthSession.makeRedirectUri({
    scheme: 'atlasbasket-customer',
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
      setIsGoogleLoading(false);
      return;
    }

    if (googleResponse.type !== 'success') {
      googleLoginPending.current = false;
      setIsGoogleLoading(false);
      if (googleResponse.type === 'error') {
        const msg =
          googleResponse.error?.description ||
          (googleResponse.error as any)?.message ||
          'Google sign-in was cancelled or failed.';
        setGoogleError(msg);
        options?.onError?.(msg);
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
        setGoogleError(null);
        options?.onSuccess?.();
      } catch (err: any) {
        googleLoginPending.current = false;
        const msg = err.message || 'Google sign-in failed. Please try again.';
        setGoogleError(msg);
        options?.onError?.(msg);
      } finally {
        setIsGoogleLoading(false);
      }
    })();
  }, [googleResponse, googleRequest, googleLogin, options]);

  const handleGoogleAuth = async () => {
    if (!isGoogleConfigured || !googleRequest) {
      const msg =
        'Google sign-in is not configured. Add the Google client IDs to the app environment.';
      setGoogleError(msg);
      options?.onError?.(msg);
      return;
    }

    setGoogleError(null);
    setIsGoogleLoading(true);
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
        setIsGoogleLoading(false);
      }
    } catch (err: any) {
      googleLoginPending.current = false;
      const msg = err.message || 'Google sign-in failed. Please try again.';
      setGoogleError(msg);
      options?.onError?.(msg);
      setIsGoogleLoading(false);
    }
  };

  return {
    handleGoogleAuth,
    isGoogleLoading,
    googleError,
    setGoogleError,
    isGoogleConfigured,
    isGoogleReady: !!googleRequest,
  };
}
