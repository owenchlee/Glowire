import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LEVELS } from '../levels/levels';
import { COLORS } from '../render/theme';
import { useProgress } from './progress';

export function LevelSelect() {
  const { completed } = useProgress();
  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Glowire</Text>
        <Text style={styles.subtitle}>Light up every board ⚡</Text>
        <View style={styles.grid}>
          {LEVELS.map((level) => {
            const done = completed.has(level.id);
            return (
              <Pressable
                key={level.id}
                onPress={() => router.push(`/level/${level.id}`)}
                style={({ pressed }) => [
                  styles.card,
                  done && styles.cardDone,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.number}>{level.id}</Text>
                <Text style={styles.cardTitle} numberOfLines={1}>
                  {level.title}
                </Text>
                {level.newPart && <Text style={styles.badge}>New: {level.newPart.name}</Text>}
                {done && <Text style={styles.check}>✓</Text>}
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 16, paddingBottom: 40 },
  title: {
    fontSize: 40,
    fontWeight: '900',
    color: COLORS.text,
    textAlign: 'center',
    marginTop: 12,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textSoft,
    textAlign: 'center',
    marginBottom: 20,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'center' },
  card: {
    width: '46%',
    minHeight: 104,
    borderRadius: 22,
    padding: 14,
    backgroundColor: COLORS.card,
    shadowColor: '#6e5f8a',
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  cardDone: { backgroundColor: '#e3f6ea' },
  pressed: { transform: [{ scale: 0.97 }] },
  number: { fontSize: 30, fontWeight: '900', color: COLORS.text },
  cardTitle: { fontSize: 15, fontWeight: '700', color: COLORS.textSoft },
  badge: {
    alignSelf: 'flex-start',
    marginTop: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    overflow: 'hidden',
    backgroundColor: '#ffe7b8',
    color: COLORS.text,
    fontSize: 11,
    fontWeight: '800',
  },
  check: {
    position: 'absolute',
    top: 10,
    right: 14,
    fontSize: 22,
    fontWeight: '900',
    color: COLORS.success,
  },
});
