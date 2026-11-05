// Old Gus's Signal Lamp: watch the lamp flash a pattern, then flash it back.

import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { SEA_ANSWERS_AT, SIGNAL_COLOURS, type SignalColour, flashMs, rng, signalPattern } from '../game/games';
import { buzz } from './haptics';
import { CREAM, GOLD, INK, PixelText } from './pixel';

const LAMP_HEX: Record<SignalColour, string> = { red: '#e0394c', green: '#74a334', blue: '#3da6bd', gold: '#ffe166' };

export function SignalLamp({
  seed,
  onSay,
  onEnd,
  onSeaAnswer,
}: {
  seed: number;
  onSay: (s: string) => void;
  onEnd: (score: number) => void;
  onSeaAnswer: () => void;
}) {
  const pattern = useMemo(() => signalPattern(60, rng(seed)), [seed]);
  const [length, setLength] = useState(1);
  const [showing, setShowing] = useState(true);
  const [lit, setLit] = useState<SignalColour | null>(null);
  const [typed, setTyped] = useState(0);
  const answered = useRef(false);
  const [over, setOver] = useState(false);

  // Play the pattern so far on the big lamp.
  useEffect(() => {
    if (!showing || over) return;
    const ms = flashMs(length);
    const timers: ReturnType<typeof setTimeout>[] = [];
    for (let i = 0; i < length; i++) {
      timers.push(setTimeout(() => setLit(pattern[i]!), 700 + i * ms));
      timers.push(setTimeout(() => setLit(null), 700 + i * ms + ms * 0.7));
    }
    timers.push(setTimeout(() => setShowing(false), 700 + length * ms));
    return () => timers.forEach(clearTimeout);
  }, [showing, length, pattern, over]);

  const press = (c: SignalColour) => {
    if (showing || over) return;
    setLit(c);
    setTimeout(() => setLit((l) => (l === c ? null : l)), 180);
    if (c !== pattern[typed]) {
      buzz.oops();
      onSay(`Ah, it was ${pattern[typed]}. You flashed back ${length - 1} in a row. Not bad for a landlubber.`);
      setOver(true);
      setTimeout(() => onEnd(length - 1), 1200);
      return;
    }
    buzz.tap();
    if (typed + 1 < length) return setTyped(typed + 1);
    // The whole pattern, right: one more flash next time.
    if (length >= SEA_ANSWERS_AT && !answered.current) {
      answered.current = true;
      onSeaAnswer();
    } else onSay(length % 3 === 0 ? 'Good eyes! The ships out there can read you loud and clear.' : 'Aye, that’s it. Here comes another…');
    setTyped(0);
    setLength(length + 1);
    setShowing(true);
  };

  return (
    <View style={styles.game}>
      <View style={styles.row}>
        <PixelText size={13} color={CREAM} shadow style={styles.flex}>
          {showing ? 'Watch the lamp…' : `Your turn: ${typed} of ${length}`}
        </PixelText>
        <PixelText size={13} color={GOLD} shadow>
          Score {Math.max(0, length - 1)}
        </PixelText>
      </View>
      <View style={styles.lampWrap}>
        <View style={[styles.bigLamp, { backgroundColor: lit ? LAMP_HEX[lit] : '#2e2b30', shadowColor: lit ? LAMP_HEX[lit] : 'transparent' }]} />
      </View>
      <View style={styles.answers}>
        {SIGNAL_COLOURS.map((c) => (
          <Pressable
            key={c}
            onPress={() => press(c)}
            disabled={showing || over}
            accessibilityRole="button"
            accessibilityLabel={`${c} lamp`}
            accessibilityState={{ disabled: showing || over }}
            style={[styles.lampButton, { backgroundColor: LAMP_HEX[c], opacity: showing || over ? 0.45 : lit === c ? 1 : 0.8 }]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  game: { flex: 1, gap: 14, justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  flex: { flex: 1 },
  answers: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center' },
  lampWrap: { alignItems: 'center', paddingVertical: 8 },
  bigLamp: { width: 110, height: 110, borderRadius: 55, borderWidth: 4, borderColor: INK, shadowRadius: 30, shadowOpacity: 0.9 },
  lampButton: { width: 84, height: 64, borderRadius: 10, borderWidth: 3, borderColor: INK },
});
