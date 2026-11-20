// Title-screen pieces (logo, daily cards, rise-in animation). Kept apart from the Story screen so the title does not load the level data.

import { router } from 'expo-router';
import { type ReactNode, useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

import { brainDaily } from '../game/dailyBrain';
import { GAMES } from '../game/games';
import { currentBrainStreak, currentStreak, dayKey } from '../game/save';
import { useGame } from './game';
import { CREAM, GOLD, Panel, PixelButton, PixelText } from './pixel';

const styles = StyleSheet.create({
  logo: { letterSpacing: 3 },
  logoRow: { flexDirection: 'row' },
  card: { width: 340 },
  dailyTitle: { marginTop: 8 },
  dailyCopy: { marginTop: 8, minHeight: 54 },
  dailyFoot: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 40,
  },
});

/** A card that slides up and fades in, a beat after the one before it. */
export function Rise({ index, children }: { index: number; children: ReactNode }) {
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(t, { toValue: 1, duration: 420, delay: 120 + index * 110, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [t, index]);
  return (
    <Animated.View style={{ opacity: t, transform: [{ translateY: t.interpolate({ inputRange: [0, 1], outputRange: [28, 0] }) }] }}>
      {children}
    </Animated.View>
  );
}

/** The title, wired up like the game: every few seconds a surge runs along it and each letter flickers. */
export function GlowLogo({ size = 40 }: { size?: number }) {
  const letters = 'GLOWIRE'.split('');
  const flick = useRef(letters.map(() => new Animated.Value(1))).current;
  useEffect(() => {
    const surge = Animated.loop(
      Animated.sequence([
        Animated.delay(2600),
        Animated.stagger(
          90,
          flick.map((v) =>
            Animated.sequence([
              Animated.timing(v, { toValue: 0.25, duration: 70, useNativeDriver: true }),
              Animated.timing(v, { toValue: 1, duration: 110, useNativeDriver: true }),
              Animated.timing(v, { toValue: 0.55, duration: 60, useNativeDriver: true }),
              Animated.timing(v, { toValue: 1, duration: 160, useNativeDriver: true }),
            ]),
          ),
        ),
      ]),
    );
    surge.start();
    return () => surge.stop();
  }, [flick]);
  return (
    <View style={styles.logoRow}>
      {letters.map((l, i) => (
        <Animated.View key={i} style={{ opacity: flick[i]! }}>
          <PixelText size={size} color={GOLD} shadow style={styles.logo}>
            {l}
          </PixelText>
        </Animated.View>
      ))}
    </View>
  );
}

export function DailyCard() {
  const { save } = useGame();
  const today = dayKey(new Date());
  const best = save.daily.stars[today] ?? 0;
  const streak = currentStreak(save, today);

  return (
    <Panel style={styles.card} tone="night">
      <PixelText size={12} color={GOLD}>
        DAILY BLACKOUT
      </PixelText>
      <PixelText size={22} color={CREAM} style={styles.dailyTitle}>
        A new circuit every day
      </PixelText>
      <PixelText size={13} color="#b9b2db" style={styles.dailyCopy}>
        {best > 0
          ? `Today's best: ${'★'.repeat(best)} · ${streak}-day streak`
          : streak > 0
            ? `${streak}-day streak · Keep it glowing!`
            : 'Solve today’s circuit to start a streak.'}
      </PixelText>
      <View style={styles.dailyFoot}>
        <PixelText size={12} color="#c9c3e6">
          New challenge daily
        </PixelText>
        <PixelButton
          label={best > 0 ? 'Replay today' : 'Play today'}
          tone="gold"
          size={12}
          onPress={() => router.push('/daily')}
        />
      </View>
    </Panel>
  );
}

export function BrainDailyCard() {
  const { save } = useGame();
  const today = dayKey(new Date());
  const best = save.brainDaily.stars[today] ?? 0;
  const streak = currentBrainStreak(save, today);
  const game = GAMES[brainDaily(today).game].title;

  return (
    <Panel style={styles.card} tone="night">
      <PixelText size={12} color={GOLD}>
        DAILY BRAIN TEASER
      </PixelText>
      <PixelText size={22} color={CREAM} style={styles.dailyTitle}>
        Today: {game}
      </PixelText>
      <PixelText size={13} color="#b9b2db" style={styles.dailyCopy}>
        {best > 0
          ? `Today's best: ${'★'.repeat(best)} · ${streak}-day streak`
          : streak > 0
            ? `${streak}-day streak · Keep it glowing!`
            : 'Earn a star on today’s puzzle to start a streak.'}
      </PixelText>
      <View style={styles.dailyFoot}>
        <PixelText size={12} color="#c9c3e6">
          New puzzle daily
        </PixelText>
        <PixelButton
          label={best > 0 ? 'Replay today' : 'Play today'}
          tone="gold"
          size={12}
          onPress={() => router.push('/brain-daily')}
        />
      </View>
    </Panel>
  );
}
