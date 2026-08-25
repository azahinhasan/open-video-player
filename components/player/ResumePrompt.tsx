import { Pressable, StyleSheet, Text, View } from 'react-native';

import { formatTime } from '@/utils/formatTime';

type ResumePromptProps = {
  positionSeconds: number;
  onResume: () => void;
  onStartOver: () => void;
};

export function ResumePrompt({ positionSeconds, onResume, onStartOver }: ResumePromptProps) {
  return (
    <View style={styles.backdrop}>
      <View style={styles.card}>
        <Text style={styles.title}>Resume playback?</Text>
        <Text style={styles.subtitle}>You left off at {formatTime(positionSeconds)}</Text>
        <View style={styles.row}>
          <Pressable style={[styles.button, styles.secondaryButton]} onPress={onStartOver}>
            <Text style={styles.buttonText}>Start over</Text>
          </Pressable>
          <Pressable style={[styles.button, styles.primaryButton]} onPress={onResume}>
            <Text style={styles.buttonText}>Resume</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    backgroundColor: 'rgba(20,20,20,0.95)',
    borderRadius: 14,
    paddingHorizontal: 20,
    paddingVertical: 18,
    width: 260,
    alignItems: 'center',
  },
  title: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  subtitle: {
    color: '#ccc',
    fontSize: 13,
    marginTop: 6,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  button: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 8,
  },
  primaryButton: {
    backgroundColor: '#F97316',
  },
  secondaryButton: {
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 13,
  },
});
