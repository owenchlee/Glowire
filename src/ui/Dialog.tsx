// Someone talking: their portrait, their name on a tab, and their words typed out.
// Tap (or press Enter / Space / E) to go on; the last line can offer choices.

import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Platform, Pressable, StyleSheet, View } from 'react-native';

import { person } from '../game/cast';
import { buzz } from './haptics';
import { NameTab, Panel, PixelButton, PixelText, Portrait, TEXT_SOFT } from './pixel';

export interface DialogLine {
  who: string;
  text: string;
}

export interface Choice {
  label: string;
  tone?: 'orange' | 'gold' | 'teal' | 'cream';
  onPress: () => void;
}

export function speakerName(who: string): string {
  if (who === 'pip') return 'Pip';
  if (who === 'grumble') return 'Grumble';
  if (who === 'hero') return 'You';
  return person(who).name;
}

export function Dialog({
  lines,
  choices,
  onClose,
}: {
  lines: DialogLine[];
  /** Shown under the last line. Without choices, tapping past the last line closes it. */
  choices?: Choice[];
  onClose: () => void;
}) {
  const [index, setIndex] = useState(0);
  const [shown, setShown] = useState(0);
  const line = lines[index]!;
  const last = index === lines.length - 1;
  const done = shown >= line.text.length;
  const rise = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(rise, { toValue: 1, duration: 180, useNativeDriver: true }).start();
  }, [rise]);

  // Type the line out a couple of letters at a time.
  useEffect(() => {
    const timer = setInterval(
      () =>
        setShown((n) => {
          if (n >= line.text.length) clearInterval(timer);
          return Math.min(line.text.length, n + 2);
        }),
      22,
    );
    return () => clearInterval(timer);
  }, [line]);

  const advance = useCallback(() => {
    if (!done) return setShown(line.text.length);
    if (!last) {
      buzz.tap();
      setShown(0);
      setIndex((i) => i + 1);
    } else if (!choices?.length) onClose();
  }, [done, last, line, choices, onClose]);

  // Keyboard: Enter / Space / E to go on, number keys for choices, Escape to leave.
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const onKey = (e: KeyboardEvent) => {
      if (['Enter', ' ', 'e', 'E'].includes(e.key)) {
        e.preventDefault();
        if (done && last && choices?.length) choices[0]!.onPress();
        else advance();
      } else if (e.key === 'Escape') onClose();
      else if (done && last && choices) {
        const n = Number(e.key);
        if (n >= 1 && n <= choices.length) choices[n - 1]!.onPress();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [advance, done, last, choices, onClose]);

  const translateY = rise.interpolate({ inputRange: [0, 1], outputRange: [40, 0] });
  return (
    <View style={styles.cover}>
      <Pressable style={StyleSheet.absoluteFill} onPress={advance} />
      <Animated.View style={[styles.wrap, { opacity: rise, transform: [{ translateY }] }]}>
        <Portrait who={line.who} size={88} key={line.who} />
        <Pressable style={styles.flex} onPress={advance}>
          <NameTab name={speakerName(line.who)} />
          <Panel style={styles.panel}>
            <PixelText size={16} style={styles.text}>
              {line.text.slice(0, shown)}
            </PixelText>
            <View style={styles.footer}>
              {done && last && choices?.length ? (
                <View style={styles.choices}>
                  {choices.map((c) => (
                    <PixelButton key={c.label} label={c.label} tone={c.tone ?? 'orange'} onPress={c.onPress} />
                  ))}
                </View>
              ) : (
                <PixelText size={12} color={TEXT_SOFT}>
                  {done ? (last ? 'tap to close' : 'tap ▼') : ' '}
                </PixelText>
              )}
            </View>
          </Panel>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  cover: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 14,
    zIndex: 50,
  },
  wrap: {
    width: '100%',
    maxWidth: 760,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
  },
  flex: { flex: 1 },
  panel: { minHeight: 112 },
  text: { minHeight: 46 },
  footer: { marginTop: 8, alignItems: 'flex-end', minHeight: 20 },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'flex-end' },
});

