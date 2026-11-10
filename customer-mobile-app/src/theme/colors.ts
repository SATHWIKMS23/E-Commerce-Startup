/**
 * Color tokens exactly matching customer-app globals.css
 * Dark monochrome palette with high-contrast accents
 */
export const colors = {
  // Base backgrounds
  background: '#0a0a0a',        // hsl(0 0% 4%)
  backgroundAlt: '#080808',     // slightly darker hero section
  card: '#121212',              // hsl(0 0% 7%)
  cardBorder: 'rgba(255, 255, 255, 0.08)',
  cardHover: '#18181b',
  popover: '#121212',
  
  // Foreground / Typography
  foreground: '#fafafa',        // hsl(0 0% 98%)
  foregroundMuted: '#8c8c8c',   // hsl(0 0% 55%)
  foregroundDim: 'rgba(255, 255, 255, 0.35)',
  foregroundSubtle: 'rgba(255, 255, 255, 0.20)',
  
  // Primary (Pure white on black)
  primary: '#ffffff',
  primaryForeground: '#000000',
  
  // Secondary & Accents
  secondary: '#1c1c1f',         // hsl(0 0% 12%)
  secondaryForeground: '#fafafa',
  accent: '#262629',
  accentForeground: '#ffffff',
  
  // Glass tokens
  glassBg: 'rgba(255, 255, 255, 0.04)',
  glassBgHover: 'rgba(255, 255, 255, 0.08)',
  glassBorder: 'rgba(255, 255, 255, 0.10)',
  glassBorderStrong: 'rgba(255, 255, 255, 0.22)',
  glassInputBg: 'rgba(255, 255, 255, 0.05)',
  glassInputBorder: 'rgba(255, 255, 255, 0.12)',

  // Status & Alerts
  destructive: '#ef4444',       // hsl(0 72% 51%)
  destructiveForeground: '#fafafa',
  destructiveLight: 'rgba(239, 68, 68, 0.15)',
  success: '#10b981',
  successLight: 'rgba(16, 185, 129, 0.15)',
  warning: '#f59e0b',
  warningLight: 'rgba(245, 158, 11, 0.15)',
  indigo: '#6366f1',
  indigoLight: 'rgba(99, 102, 241, 0.15)',

  // Borders & Inputs
  border: 'rgba(255, 255, 255, 0.12)',
  borderMuted: 'rgba(255, 255, 255, 0.06)',
  input: 'rgba(255, 255, 255, 0.10)',
  ring: 'rgba(255, 255, 255, 0.70)',
};
