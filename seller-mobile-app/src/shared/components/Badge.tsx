import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { Colors } from '@/theme/colors';

export type BadgeVariant =
  | 'default'
  | 'secondary'
  | 'destructive'
  | 'outline'
  | 'success'
  | 'warning'
  | 'info'
  | 'emerald'
  | 'yellow'
  | 'rose'
  | 'indigo'
  | 'cyan';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  style?: ViewStyle;
  textStyle?: TextStyle;
  className?: string;
}

export function Badge({ children, variant = 'default', style, textStyle }: BadgeProps) {
  const getColors = () => {
    switch (variant) {
      case 'default':
      case 'indigo':
        return {
          bg: Colors.purpleBg,
          border: Colors.purpleBorder,
          text: Colors.purpleLight,
        };
      case 'secondary':
        return {
          bg: 'rgba(255, 255, 255, 0.06)',
          border: 'rgba(255, 255, 255, 0.1)',
          text: Colors.textSecondary,
        };
      case 'destructive':
      case 'rose':
        return {
          bg: Colors.roseBg,
          border: Colors.roseBorder,
          text: Colors.rose,
        };
      case 'outline':
        return {
          bg: 'transparent',
          border: 'rgba(255, 255, 255, 0.15)',
          text: Colors.textMuted,
        };
      case 'success':
      case 'emerald':
        return {
          bg: Colors.emeraldBg,
          border: Colors.emeraldBorder,
          text: Colors.emerald,
        };
      case 'warning':
      case 'yellow':
        return {
          bg: Colors.yellowBg,
          border: Colors.yellowBorder,
          text: Colors.yellow,
        };
      case 'info':
      case 'cyan':
        return {
          bg: Colors.cyanBg,
          border: Colors.cyanBg,
          text: Colors.cyan,
        };
      default:
        return {
          bg: Colors.purpleBg,
          border: Colors.purpleBorder,
          text: Colors.purpleLight,
        };
    }
  };

  const c = getColors();

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: c.bg, borderColor: c.border },
        style,
      ]}
    >
      <Text style={[styles.text, { color: c.text }, textStyle]}>
        {children}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 9999,
    borderWidth: 1,
    alignSelf: 'flex-start',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
});
