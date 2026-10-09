// Story scenes: a speaker's face, their name, and their words typed out. Tap to go on.

import { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';

import type { Scene } from '../game/story';
import { COLORS } from '../render/theme';
import { Face, speakerName } from './characters/Portrait';

export function SceneDialog({
  scene,
  hat,
  onDone,
}: {
  scene: Scene;
  hat?: string;
  onDone: () => void;
}) {
  const [index, setIndex] = useState(0);
  const [shown, setShown] = useState(0);
  const line = scene.lines[index]!;
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fade, { toValue: 1, duration: 220, useNativeDriver: true }).start();
  }, [fade]);

  // Type the line out, a few letters at a time. (`next` resets `shown` for each new line.)
  useEffect(() => {
    const timer = setInterval(
      () =>
        setShown((n) => {
          if (n >= line.text.length) clearInterval(timer);
          return Math.min(line.text.length, n + 2);
        }),
      18,
    );
    return () => clearInterval(timer);
  }, [line]);

  const next = () => {
    if (shown < line.text.length) return setShown(line.text.length);
    if (index + 1 < scene.lines.length) {
      setShown(0);
      setIndex(index + 1);
    } else onDone();
  };

  const villain = line.who === 'grumble';
  return (
    <Animated.View style={[styles.backdrop, { opacity: fade }]}>
      <Pressable style={StyleSheet.absoluteFill} onPress={next} />
      <View style={styles.stage} pointerEvents="none">
        <Face who={line.who} size={132} hat={hat} key={line.who} />
      </View>
      <Pressable onPress={next} style={[styles.box, villain && styles.villainBox]}>
        <Text style={[styles.name, villain && styles.villainName]}>{speakerName(line.who)}</Text>
        <Text style={styles.text}>{line.text.slice(0, shown)}</Text>
        <View style={styles.footer}>
          <Text style={styles.progress}>
            {index + 1} / {scene.lines.length}
          </Text>
          <Text style={styles.tap}>{shown < line.text.length ? 'Tap to skip' : 'Tap ›'}</Text>
        </View>
      </Pressable>
      <Pressable onPress={onDone} style={styles.skip} hitSlop={12}>
        <Text style={styles.skipText}>Skip</Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(20,16,38,0.78)',
    justifyContent: 'flex-end',
    padding: 16,
    paddingBottom: 40,
    zIndex: 50,
  },
  stage: { alignItems: 'center', marginBottom: -8 },
  box: {
    borderRadius: 24,
    padding: 18,
    backgroundColor: COLORS.card,
    minHeight: 150,
  },
  villainBox: { backgroundColor: '#ece9f6' },
  name: { fontSize: 14, fontWeight: '900', color: COLORS.success, letterSpacing: 0.5 },
  villainName: { color: '#6d6890' },
  text: { fontSize: 18, lineHeight: 25, fontWeight: '700', color: COLORS.text, marginTop: 6 },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 'auto',
    paddingTop: 10,
  },
  progress: { fontSize: 12, fontWeight: '800', color: COLORS.textSoft },
  tap: { fontSize: 12, fontWeight: '800', color: COLORS.textSoft },
  skip: {
    position: 'absolute',
    top: 56,
    right: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  skipText: { color: '#fff', fontWeight: '800', fontSize: 13 },
});
