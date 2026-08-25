import { Ionicons } from '@expo/vector-icons';
import { Linking, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useAccentColor } from '@/hooks/useThemePreference';

type PermissionGateProps = {
  status: 'needs-permission' | 'denied' | 'error';
  canAskAgain: boolean;
  errorMessage?: string | null;
  onRequestAccess: () => void;
};

export function PermissionGate({
  status,
  canAskAgain,
  errorMessage,
  onRequestAccess,
}: PermissionGateProps) {
  const accentColor = useAccentColor();
  const blocked = status === 'denied' && !canAskAgain;

  const handlePress = () => {
    if (blocked) {
      Linking.openSettings();
    } else {
      onRequestAccess();
    }
  };

  return (
    <View style={styles.container}>
      <Ionicons name="videocam-outline" size={48} color="#5a6672" />
      <ThemedText style={styles.title}>Access your videos</ThemedText>
      <ThemedText style={styles.subtitle}>
        {status === 'error'
          ? (errorMessage ?? 'Something went wrong scanning your device.')
          : blocked
            ? 'Video access was denied. Enable it in system settings to continue.'
            : 'Allow access to your videos so the app can find and organize them by folder automatically.'}
      </ThemedText>
      <Pressable style={[styles.button, { backgroundColor: accentColor }]} onPress={handlePress}>
        <ThemedText style={styles.buttonText}>
          {blocked ? 'Open Settings' : status === 'error' ? 'Try again' : 'Grant access'}
        </ThemedText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 32,
    paddingVertical: 48,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
  },
  subtitle: {
    textAlign: 'center',
    opacity: 0.7,
    fontSize: 13,
  },
  button: {
    marginTop: 12,
    paddingHorizontal: 20,
    paddingVertical: 11,
    borderRadius: 10,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '700',
  },
});
