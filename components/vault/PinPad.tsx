import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useAccentColor } from '@/hooks/useThemePreference';
import { spacing, typography } from '@/theme/tokens';

export const PIN_LENGTH = 6;

const DIGITS = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

type PinPadProps = {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
};

export function PinPad({ value, onChange, disabled = false }: PinPadProps) {
  const accentColor = useAccentColor();
  const borderColor = useThemeColor({}, 'surfaceBorder');
  const textColor = useThemeColor({}, 'text');

  const press = (digit: string) => {
    if (disabled || value.length >= PIN_LENGTH) {
      return;
    }
    onChange(value + digit);
  };

  const backspace = () => {
    if (disabled || value.length === 0) {
      return;
    }
    onChange(value.slice(0, -1));
  };

  return (
    <View style={styles.container}>
      <View style={styles.dots}>
        {Array.from({ length: PIN_LENGTH }).map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              { borderColor },
              i < value.length ? { backgroundColor: accentColor, borderColor: accentColor } : null,
            ]}
          />
        ))}
      </View>
      <View style={styles.grid}>
        {DIGITS.map((digit) => (
          <Pressable key={digit} style={styles.key} onPress={() => press(digit)} disabled={disabled} hitSlop={4}>
            <ThemedText style={styles.keyLabel}>{digit}</ThemedText>
          </Pressable>
        ))}
        <View style={styles.key} />
        <Pressable style={styles.key} onPress={() => press('0')} disabled={disabled} hitSlop={4}>
          <ThemedText style={styles.keyLabel}>0</ThemedText>
        </Pressable>
        <Pressable style={styles.key} onPress={backspace} disabled={disabled} hitSlop={4}>
          <Ionicons name="backspace-outline" size={22} color={textColor} />
        </Pressable>
      </View>
    </View>
  );
}

const KEY_SIZE = 72;

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: spacing.xl,
  },
  dots: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: KEY_SIZE * 3,
    justifyContent: 'center',
  },
  key: {
    width: KEY_SIZE,
    height: KEY_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyLabel: {
    fontSize: 26,
    fontWeight: typography.weight.medium,
  },
});
