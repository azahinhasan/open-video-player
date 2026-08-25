/**
 * Design system source of truth ("Obsidian Rail"). Colors, spacing, radius,
 * typography and motion durations live here — screens should consume these
 * tokens (directly or via constants/theme.ts, which re-exports the color
 * portion for the existing ThemedText/ThemedView plumbing) rather than
 * hardcoding values locally.
 */

const palette = {
  obsidian: '#0B0C0E',
  surfaceDark: '#16181B',
  surfaceBorderDark: '#26292D',
  textPrimaryDark: '#EDEDEA',
  textSecondaryDark: '#9A9A96',
  textMutedDark: '#5C5C58',

  paper: '#F7F6F4',
  surfaceLight: '#FFFFFF',
  surfaceBorderLight: '#E4E2DE',
  textPrimaryLight: '#15171A',
  textSecondaryLight: '#5C5F63',
  textMutedLight: '#9A9D9F',

  coral: '#E2603A',
  teal: '#1D9E75',
  amber: '#BA7517',
  violet: '#7F77DD',
  danger: '#E5484D',
} as const;

export const themeColors = {
  dark: {
    background: palette.obsidian,
    surface: palette.surfaceDark,
    surfaceBorder: palette.surfaceBorderDark,
    text: palette.textPrimaryDark,
    textSecondary: palette.textSecondaryDark,
    textMuted: palette.textMutedDark,
    icon: palette.textSecondaryDark,
    danger: palette.danger,
  },
  light: {
    background: palette.paper,
    surface: palette.surfaceLight,
    surfaceBorder: palette.surfaceBorderLight,
    text: palette.textPrimaryLight,
    textSecondary: palette.textSecondaryLight,
    textMuted: palette.textMutedLight,
    icon: palette.textSecondaryLight,
    danger: palette.danger,
  },
} as const;

export const accentPalette = {
  coral: palette.coral,
  teal: palette.teal,
  amber: palette.amber,
  violet: palette.violet,
} as const;

export type AccentKey = keyof typeof accentPalette;

export const accentLabels: Record<AccentKey, string> = {
  coral: 'Coral',
  teal: 'Teal',
  amber: 'Amber',
  violet: 'Violet',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
} as const;

export const radius = {
  sm: 10,
  md: 14,
  full: 999,
} as const;

export const typography = {
  size: {
    title: 22,
    body: 16,
    meta: 13,
    micro: 11,
  },
  weight: {
    regular: '400',
    medium: '500',
  },
} as const;

export const motion = {
  tapMs: 180,
  screenMs: 260,
  staggerMs: 30,
  liftPx: 8,
  spring: {
    damping: 16,
    stiffness: 180,
  },
} as const;
