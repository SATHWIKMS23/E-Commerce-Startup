import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
  TextStyle,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '@/theme/colors';

export type ButtonVariant =
  | 'default'
  | 'secondary'
  | 'outline'
  | 'ghost'
  | 'destructive'
  | 'gradient';

export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

interface ButtonProps {
  onPress?: () => void;
  children?: React.ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  icon?: React.ReactNode;
  className?: string;
}

export function Button({
  onPress,
  children,
  variant = 'default',
  size = 'md',
  disabled = false,
  loading = false,
  style,
  textStyle,
  icon,
}: ButtonProps) {
  const isGradient = variant === 'default' || variant === 'gradient';

  const getSizeStyle = () => {
    switch (size) {
      case 'sm':
        return { height: 34, paddingHorizontal: 12, borderRadius: 10 };
      case 'lg':
        return { height: 48, paddingHorizontal: 22, borderRadius: 14 };
      case 'icon':
        return { height: 38, width: 38, paddingHorizontal: 0, borderRadius: 10 };
      default:
        return { height: 44, paddingHorizontal: 16, borderRadius: 12 };
    }
  };

  const getVariantStyle = (): {
    bg: string;
    border: string;
    textColor: string;
  } => {
    switch (variant) {
      case 'secondary':
        return {
          bg: 'rgba(255, 255, 255, 0.05)',
          border: 'rgba(255, 255, 255, 0.12)',
          textColor: '#ffffff',
        };
      case 'outline':
        return {
          bg: 'transparent',
          border: 'rgba(255, 255, 255, 0.15)',
          textColor: 'rgba(255, 255, 255, 0.9)',
        };
      case 'ghost':
        return {
          bg: 'transparent',
          border: 'transparent',
          textColor: 'rgba(255, 255, 255, 0.75)',
        };
      case 'destructive':
        return {
          bg: Colors.rose,
          border: Colors.rose,
          textColor: '#ffffff',
        };
      case 'default':
      case 'gradient':
      default:
        return {
          bg: Colors.purple,
          border: 'transparent',
          textColor: '#ffffff',
        };
    }
  };

  const v = getVariantStyle();
  const sz = getSizeStyle();

  const content = (
    <View style={styles.innerContent}>
      {loading ? (
        <ActivityIndicator
          size="small"
          color="#ffffff"
          style={{ marginRight: children ? 8 : 0 }}
        />
      ) : icon ? (
        <View style={{ marginRight: children ? 8 : 0 }}>{icon}</View>
      ) : null}
      {typeof children === 'string' ? (
        <Text
          style={[
            styles.text,
            size === 'sm' && styles.textSm,
            { color: v.textColor },
            textStyle,
          ]}
        >
          {children}
        </Text>
      ) : (
        children
      )}
    </View>
  );

  if (isGradient) {
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={disabled || loading}
        activeOpacity={0.85}
        style={[
          styles.baseButton,
          styles.gradientShadow,
          sz,
          { opacity: disabled ? 0.5 : 1, overflow: 'hidden' },
          style,
        ]}
      >
        <LinearGradient
          colors={['#a855f7', '#6366f1']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[StyleSheet.absoluteFill, styles.gradientFill]}
        >
          {content}
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.75}
      style={[
        styles.baseButton,
        sz,
        {
          backgroundColor: v.bg,
          borderColor: v.border,
          borderWidth: 1,
          opacity: disabled ? 0.5 : 1,
        },
        style,
      ]}
    >
      {content}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  baseButton: {
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  gradientShadow: {
    shadowColor: '#a855f7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    elevation: 6,
  },
  innerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gradientFill: {
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    paddingHorizontal: 16,
  },
  text: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  textSm: {
    fontSize: 11,
    fontWeight: '600',
  },
});
