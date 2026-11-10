import React, { useState } from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  View,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { supabase } from '@/lib/supabase';

interface GoogleButtonProps {
  label?: string;
  onError?: (msg: string) => void;
}

export function GoogleButton({ label = 'Continue with Google', onError }: GoogleButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          scopes: 'openid profile email',
        },
      });

      if (error) {
        throw error;
      }
    } catch (err: any) {
      if (onError) {
        onError(err?.message || 'Failed to initiate Google Sign In.');
      }
      setLoading(false);
    }
  };

  return (
    <TouchableOpacity
      onPress={handleLogin}
      disabled={loading}
      activeOpacity={0.8}
      style={styles.button}
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
  );
}

const styles = StyleSheet.create({
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
});
