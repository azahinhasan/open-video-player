/**
 * Design system source of truth ("Obsidian Rail" neutrals + "Tomato Rail"
 * accent layer). Colors, spacing, radius, typography and motion durations
 * live here — screens should consume these tokens (directly or via
 * constants/theme.ts, which re-exports the color portion for the existing
 * ThemedText/ThemedView plumbing) rather than hardcoding values locally.
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

  // Tomato Rail — the default accent. A deepened version of pure tomato
  // (#FF6347) so it holds contrast for text/icons on top of it; pure tomato
  // is reserved for the icon/marketing gradient, never used flat in UI.
  tomato: '#E64536',
  tomatoMuted: '#3A1712',
  tomatoHover: '#F0523F',

  blue: '#3B82F6',
  green: '#22C55E',
  purple: '#A855F7',

  secondaryCyan: '#22D3EE',
  secondaryBlue: '#3B82F6',

  // Kept deliberately separate from the accent so delete actions never
  // visually blend into normal accent UI, regardless of chosen accent.
  danger: '#E24B4A',
  dangerHover: '#F0605F',
} as const;

// Player overlay is always dark regardless of app theme (video content is
// conventionally framed in a dark surface), so these don't split by light/dark.
export const playerColors = {
  chapterWatched: '#4A4A46',
  chapterUpcoming: '#3A3A38',
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
  tomato: palette.tomato,
  blue: palette.blue,
  green: palette.green,
  purple: palette.purple,
} as const;

export type AccentKey = keyof typeof accentPalette;

export const accentLabels: Record<AccentKey, string> = {
  tomato: 'Tomato',
  blue: 'Blue',
  green: 'Green',
  purple: 'Purple',
};

// Fixed hover/muted variants for the default Tomato accent (selected-chip
// fill, pressed states). For non-default accents these are derived at
// runtime via utils/color.ts's accentHoverColor/accentMutedColor instead.
export const tomatoAccentExtras = {
  muted: palette.tomatoMuted,
  hover: palette.tomatoHover,
} as const;

export const secondaryColors = {
  cyan: palette.secondaryCyan,
  blue: palette.secondaryBlue,
} as const;

export const dangerColors = {
  base: palette.danger,
  hover: palette.dangerHover,
} as const;

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
