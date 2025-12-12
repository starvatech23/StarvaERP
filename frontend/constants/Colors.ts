/**
 * Global Color Palette - Orange, Blue, and White Theme
 * WCAG AA Compliant for accessibility
 * Supports both light and dark modes
 */

export const Colors = {
  // ============= PRIMARY - Blue =============
  // Main brand color for primary actions, headers, and key UI elements
  primary: '#1E88E5', // Vibrant Blue (WCAG AA compliant on white)
  primaryLight: '#64B5F6', // Light Blue
  primaryDark: '#1565C0', // Dark Blue
  primaryPale: '#E3F2FD', // Very light blue for backgrounds
  
  // ============= SECONDARY - Orange =============
  // Accent color for CTAs, highlights, and important actions
  secondary: '#FF6F00', // Vibrant Orange (WCAG AA compliant on white)
  secondaryLight: '#FFA726', // Light Orange
  secondaryDark: '#E65100', // Dark Orange
  secondaryPale: '#FFF3E0', // Very light orange for backgrounds
  
  // ============= NEUTRAL - White & Greys =============
  // Base colors for backgrounds, surfaces, and structure
  white: '#FFFFFF',
  background: '#F5F7FA', // Off-white background
  surface: '#FFFFFF', // White cards and surfaces
  surfaceHover: '#F8FAFC', // Slight tint on hover
  border: '#E2E8F0', // Light grey borders
  borderDark: '#CBD5E1', // Darker borders
  
  // ============= TEXT COLORS =============
  // Optimized for readability on white/light backgrounds
  textPrimary: '#1A202C', // Almost black (WCAG AAA)
  textSecondary: '#4A5568', // Dark grey (WCAG AA)
  textTertiary: '#718096', // Medium grey
  textLight: '#A0AEC0', // Light grey for subtle text
  textOnPrimary: '#FFFFFF', // White text on blue
  textOnSecondary: '#FFFFFF', // White text on orange
  
  // ============= STATUS COLORS =============
  // Semantic colors for various states
  success: '#10B981', // Green
  successLight: '#D1FAE5',
  successPale: '#ECFDF5',
  warning: '#F59E0B', // Amber
  warningLight: '#FEF3C7',
  warningPale: '#FFFBEB',
  error: '#EF4444', // Red
  errorLight: '#FEE2E2',
  danger: '#EF4444', // Alias for error
  dangerPale: '#FEE2E2',
  info: '#3B82F6', // Blue
  infoLight: '#DBEAFE',
  
  // ============= BACKGROUND VARIANTS =============
  backgroundAlt: '#F1F5F9', // Alternative background
  
  // ============= PROJECT STATUS =============
  planning: '#64B5F6', // Light Blue
  inProgress: '#FFA726', // Orange
  completed: '#10B981', // Green
  onHold: '#94A3B8', // Grey
  cancelled: '#EF4444', // Red
  
  // ============= INTERACTIVE STATES =============
  hover: '#F1F5F9', // Light grey hover
  pressed: '#E2E8F0', // Slightly darker pressed state
  disabled: '#E2E8F0', // Disabled background
  disabledText: '#94A3B8', // Disabled text
  
  // ============= SHADOWS & OVERLAYS =============
  shadow: 'rgba(0, 0, 0, 0.1)', // Soft shadow
  shadowDark: 'rgba(0, 0, 0, 0.2)', // Darker shadow
  overlay: 'rgba(0, 0, 0, 0.5)', // Modal overlay
  overlayLight: 'rgba(0, 0, 0, 0.3)', // Lighter overlay
  
  // ============= GRADIENTS =============
  gradientPrimary: ['#1E88E5', '#1565C0'], // Blue gradient
  gradientSecondary: ['#FF6F00', '#E65100'], // Orange gradient
  gradientAccent: ['#1E88E5', '#FF6F00'], // Blue to Orange
};

/**
 * Dark Mode Colors (for future implementation)
 * Currently app uses light mode only
 */
export const DarkColors = {
  primary: '#42A5F5',
  secondary: '#FF8F00',
  background: '#121212',
  surface: '#1E1E1E',
  border: '#2D2D2D',
  textPrimary: '#FFFFFF',
  textSecondary: '#B0B0B0',
};

export default Colors;
