import { useColorScheme as useSystemColorScheme } from 'react-native';

import { useThemePreference } from '@/hooks/useThemePreference';

export function useColorScheme(): 'light' | 'dark' {
  const systemScheme = useSystemColorScheme();
  const mode = useThemePreference((s) => s.mode);

  if (mode === 'system') {
    return systemScheme === 'dark' ? 'dark' : 'light';
  }
  return mode;
}
