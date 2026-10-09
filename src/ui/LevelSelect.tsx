import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CHAPTERS, LEVELS, levelNumber } from '../levels/levels';
import { COLORS } from '../render/theme';
import { useProgress } from './progress';

export function LevelSelect() {
  const { completed } = useProgress();
  const solved = LEVELS.filter((l) => completed.has(l.id)).length;
  const resume = LEVELS.find((l) => !completed.has(l.id));
  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Glowire</Text>
        <Text style={styles.subtitle}>
          Light up every board ⚡ {solved} / {LEVELS.length} solved
        </Text>
        {resume && (
          <Pressable
            onPress={() => router.push(`/level/${resume.id}`)}
            style={({ pressed }) => [styles.resume, pressed && styles.pressed]}
          >
            <Text style={styles.resumeKicker}>{solved === 0 ? 'Start' : 'Continue'}</Text>
            <Text style={styles.resumeTitle}>
              {levelNumber(resume.id)} {resume.title} ›
            </Text>
          </Pressable>
        )}

        {CHAPTERS.map((chapter) => {
          const done = chapter.levels.filter((l) => completed.has(l.id)).length;
          return (
            <View key={chapter.id} style={styles.chapter}>
              <View style={styles.chapterHeader}>
                <View style={styles.chapterText}>
                  <Text style={styles.chapterKicker}>Chapter {chapter.id}</Text>
                  <Text style={styles.chapterTitle}>{chapter.title}</Text>
                  <Text style={styles.chapterBlurb}>{chapter.blurb}</Text>
                </View>
                <Text
                  style={[styles.chapterCount, done === chapter.levels.length && styles.allDone]}
                >
                  {done}/{chapter.levels.length}
                </Text>
              </View>
              <View style={styles.grid}>
                {chapter.levels.map((level) => {
                  const isDone = completed.has(level.id);
                  return (
                    <Pressable
                      key={level.id}
                      onPress={() => router.push(`/level/${level.id}`)}
                      style={({ pressed }) => [
                        styles.card,
                        isDone && styles.cardDone,
                        pressed && styles.pressed,
                      ]}
                    >
                      <Text style={styles.number}>{levelNumber(level.id)}</Text>
                      <Text style={styles.cardTitle} numberOfLines={2}>
                        {level.title}
                      </Text>
                      {level.newPart && <Text style={styles.badge}>New: {level.newPart.name}</Text>}
                      {isDone && <Text style={styles.check}>✓</Text>}
                    </Pressable>
                  );
                })}
              </View>
            </View>
          );
        })}
        <Text style={styles.footer}>More chapters coming soon.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const shadow = {
  shadowColor: '#6e5f8a',
  shadowOpacity: 0.12,
  shadowRadius: 10,
  shadowOffset: { width: 0, height: 4 },
};

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
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textSoft,
    textAlign: 'center',
    marginBottom: 16,
  },
  resume: {
    borderRadius: 22,
    paddingVertical: 14,
    paddingHorizontal: 18,
    backgroundColor: COLORS.success,
    marginBottom: 8,
    ...shadow,
  },
  resumeKicker: { fontSize: 12, fontWeight: '800', color: '#e8fff2', letterSpacing: 1 },
  resumeTitle: { fontSize: 20, fontWeight: '900', color: '#fff' },
  chapter: { marginTop: 22 },
  chapterHeader: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 10, gap: 12 },
  chapterText: { flex: 1 },
  chapterKicker: { fontSize: 12, fontWeight: '800', color: COLORS.textSoft, letterSpacing: 1 },
  chapterTitle: { fontSize: 24, fontWeight: '900', color: COLORS.text },
  chapterBlurb: { fontSize: 14, fontWeight: '600', color: COLORS.textSoft },
  chapterCount: { fontSize: 16, fontWeight: '900', color: COLORS.textSoft },
  allDone: { color: COLORS.success },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  card: {
    width: '31.5%',
    minHeight: 96,
    borderRadius: 20,
    padding: 12,
    backgroundColor: COLORS.card,
    ...shadow,
  },
  cardDone: { backgroundColor: '#e3f6ea' },
  pressed: { transform: [{ scale: 0.97 }] },
  number: { fontSize: 22, fontWeight: '900', color: COLORS.text },
  cardTitle: { fontSize: 13, fontWeight: '700', color: COLORS.textSoft },
  badge: {
    alignSelf: 'flex-start',
    marginTop: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 999,
    overflow: 'hidden',
    backgroundColor: '#ffe7b8',
    color: COLORS.text,
    fontSize: 10,
    fontWeight: '800',
  },
  check: {
    position: 'absolute',
    top: 8,
    right: 12,
    fontSize: 20,
    fontWeight: '900',
    color: COLORS.success,
  },
  footer: {
    marginTop: 28,
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textSoft,
  },
});
