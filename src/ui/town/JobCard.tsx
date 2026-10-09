// Tap a building: who's asking, what they want, the star goals and the pay.

import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { person } from '../../game/cast';
import { STAR_SPARKS, withPetBonus } from '../../game/save';
import { ledNamesFor, levelLabels } from '../../levels/evaluate';
import { levelNumber } from '../../levels/levels';
import { describeStar, starGoalsFor } from '../../levels/stars';
import type { LevelDef } from '../../levels/types';
import { COLORS } from '../../render/theme';
import { Portrait } from '../characters/Portrait';
import { useGame } from '../game';
import { Button, Stars, shadow } from '../kit';

export function JobCard({
  level,
  number,
  earned,
  onStart,
  onClose,
}: {
  level: LevelDef;
  /** Shown above the title, e.g. "1-4" or "Thursday". */
  number?: string;
  earned: number;
  onStart: () => void;
  onClose: () => void;
}) {
  const { save } = useGame();
  const job = level.job!;
  const client = person(job.client);
  const labels = levelLabels(level);
  const switches = Object.keys(labels).filter((k) => k.startsWith('S')).length;
  const names = ledNamesFor(level);
  const goals = starGoalsFor(level);
  const pay = (i: number) => withPetBonus(save, STAR_SPARKS[i]! * (level.boss ? 2 : 1));
  return (
    <View style={styles.backdrop}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      <View style={styles.card}>
        <ScrollView contentContainerStyle={styles.content} bounces={false}>
          <View style={styles.header}>
            <Portrait look={client.look} size={76} />
            <View style={styles.who}>
              <Text style={styles.kicker}>
                {level.boss ? 'BOSS JOB · ' : ''}
                {number ?? levelNumber(level.id)} · {job.place}
              </Text>
              <Text style={styles.name}>{client.name}</Text>
              <Text style={styles.role}>{client.role}</Text>
            </View>
          </View>
          <View style={styles.bubble}>
            <Text style={styles.ask}>“{job.ask}”</Text>
          </View>

          <View style={styles.starsHeader}>
            <Text style={styles.section}>Stars</Text>
            <Stars earned={earned} size={18} />
          </View>
          {[
            { text: 'Finish the job', i: 0 },
            ...goals.map((g, k) => ({ text: describeStar(g, names, switches), i: k + 1 })),
          ].map(({ text, i }) => (
            <View key={i} style={styles.starRow}>
              <Text style={[styles.star, i < earned && styles.starDone]}>★</Text>
              <Text style={[styles.starText, i < earned && styles.starTextDone]}>{text}</Text>
              <Text style={styles.pay}>{i < earned ? '✓' : `⚡${pay(i)}`}</Text>
            </View>
          ))}

          <View style={styles.buttons}>
            <Button label="Not now" onPress={onClose} />
            <Button label={earned ? 'Play again' : 'Take the job ›'} primary onPress={onStart} />
          </View>
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(20,16,38,0.6)',
    justifyContent: 'flex-end',
    zIndex: 40,
  },
  card: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: COLORS.card,
    maxHeight: '88%',
    ...shadow,
  },
  content: { padding: 20, paddingBottom: 36, gap: 12 },
  header: { flexDirection: 'row', gap: 14, alignItems: 'center' },
  who: { flex: 1 },
  kicker: { fontSize: 12, fontWeight: '800', color: COLORS.textSoft, letterSpacing: 0.4 },
  name: { fontSize: 24, fontWeight: '900', color: COLORS.text },
  role: { fontSize: 13, fontWeight: '600', color: COLORS.textSoft },
  bubble: { borderRadius: 18, padding: 14, backgroundColor: '#f3ece4' },
  ask: { fontSize: 16, lineHeight: 22, fontWeight: '700', color: COLORS.text },
  starsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  section: { fontSize: 13, fontWeight: '900', color: COLORS.textSoft, letterSpacing: 1 },
  starRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  star: { fontSize: 18, color: '#d9cfe0' },
  starDone: { color: '#ffc93c' },
  starText: { flex: 1, fontSize: 15, fontWeight: '700', color: COLORS.text },
  starTextDone: { color: COLORS.textSoft },
  pay: { fontSize: 13, fontWeight: '900', color: COLORS.textSoft },
  buttons: { flexDirection: 'row', gap: 10, justifyContent: 'flex-end', marginTop: 6 },
});
