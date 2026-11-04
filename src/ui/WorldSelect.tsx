// The title screen: pick a world. Each world is its own town with its own jobs; new ones
// arrive as the game grows.

import { router } from 'expo-router';
import { type ReactNode, useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, Image, type ImageStyle, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { currentStreak, dayKey, totalStars } from '../game/save';
import { CHAPTERS } from '../levels/levels';
import { WORLDS, type WorldInfo } from '../world/worlds';
import { FACES } from './faces.generated';
import { starsFor, useGame } from './game';
import { CREAM, Counter, GOLD, NIGHT_DEEP, Panel, PixelButton, PixelText, TEXT_SOFT } from './pixel';

/** A snapshot of each world for its card (made with `npm run map-preview`, see docs/PLAN-polish.md). */
const WORLD_ART: Record<string, number> = {
  glowtown: require('../../assets/art/worlds/glowtown.png'),
  harbour: require('../../assets/art/worlds/harbour.png'),
  mossbell: require('../../assets/art/worlds/mossbell.png'),
  deep: require('../../assets/art/worlds/deep.png'),
};

export function WorldSelect() {
  const { save } = useGame();
  return (
    <View style={styles.screen}>
      <Sky />
      <SafeAreaView style={styles.flex} edges={['left', 'right']}>
        <View style={styles.top}>
          <View>
            <GlowLogo />
            <PixelText size={13} color="#c9c3e6" shadow>
              Fix the lights. Save the towns.
            </PixelText>
          </View>
          <View style={styles.flex} />
          <Counter icon="⚡" value={save.sparks} />
          <Counter icon="★" value={totalStars(save)} />
          <PixelButton label="Lucky Lantern" tone="gold" size={13} onPress={() => router.push('/casino')} />
          <PixelButton label="Shop" tone="teal" size={13} onPress={() => router.push('/shop')} />
        </View>
        <ScrollView horizontal contentContainerStyle={styles.row} showsHorizontalScrollIndicator={false}>
          <Rise index={0}>
            <DailyCard />
          </Rise>
          {WORLDS.map((w, i) => (
            <Rise key={w.id} index={i + 1}>
              <WorldCard world={w} number={i + 1} />
            </Rise>
          ))}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

/** A card that slides up and fades in, a beat after the one before it. */
function Rise({ index, children }: { index: number; children: ReactNode }) {
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
function GlowLogo() {
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
          <PixelText size={40} color={GOLD} shadow style={styles.logo}>
            {l}
          </PixelText>
        </Animated.View>
      ))}
    </View>
  );
}

function DailyCard() {
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

function WorldCard({ world, number }: { world: WorldInfo; number: number }) {
  const { save } = useGame();
  const jobs = CHAPTERS.filter((c) => world.chapters.includes(c.id)).flatMap((c) => c.levels);
  const done = jobs.filter((l) => starsFor(save, l.id) > 0).length;
  const stars = jobs.reduce((s, l) => s + starsFor(save, l.id), 0);
  const open = world.build !== null;
  const faces = useMemo(
    () => [...new Set(jobs.map((l) => l.job!.client))].slice(0, 5),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [world],
  );
  return (
    <Panel style={[styles.card, !open && styles.locked]} tone={open ? 'cream' : 'night'}>
      {WORLD_ART[world.id] !== undefined && (
        <Image source={WORLD_ART[world.id]} resizeMode="cover" style={[styles.art, !open && styles.faceDark]} />
      )}
      <PixelText size={12} color={open ? TEXT_SOFT : '#8f88b5'}>
        WORLD {number}
      </PixelText>
      <PixelText size={22} color={open ? undefined : CREAM}>
        {world.name}
      </PixelText>
      <PixelText size={13} color={open ? TEXT_SOFT : '#b9b2db'} style={styles.tagline}>
        {world.tagline}
      </PixelText>
      <View style={styles.faces}>
        {faces.map((f) => (
          <Image key={f} source={FACES[f]} style={[styles.face, !open && styles.faceDark]} />
        ))}
      </View>
      {open ? (
        <View style={styles.cardFoot}>
          <PixelText size={13}>
            {done}/{jobs.length} lit · ★ {stars}/{jobs.length * 3}
          </PixelText>
          <PixelButton label={done ? 'Continue' : 'Start'} onPress={() => router.push(`/world/${world.id}`)} />
        </View>
      ) : (
        <View style={styles.cardFoot}>
          <PixelText size={14} color={GOLD} shadow>
            Coming soon
          </PixelText>
        </View>
      )}
    </Panel>
  );
}

/** A night sky with twinkling stars. */
function Sky() {
  const stars = useMemo(() => {
    let s = 7;
    const rand = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
    return Array.from({ length: 70 }, () => ({ x: rand() * 100, y: rand() * 100, big: rand() > 0.85 }));
  }, []);
  const twinkle = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(twinkle, { toValue: 1, duration: 1400, easing: Easing.linear, useNativeDriver: true }),
        Animated.timing(twinkle, { toValue: 0, duration: 1400, easing: Easing.linear, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [twinkle]);
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {stars.map((st, i) => (
        <Animated.View
          key={i}
          style={[
            styles.star,
            {
              left: `${st.x}%`,
              top: `${st.y}%`,
              width: st.big ? 4 : 2,
              height: st.big ? 4 : 2,
              opacity: i % 3 === 0 ? twinkle : 0.7,
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: NIGHT_DEEP },
  flex: { flex: 1 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, paddingTop: 14 },
  logo: { letterSpacing: 3 },
  logoRow: { flexDirection: 'row' },
  row: { gap: 18, paddingHorizontal: 20, paddingVertical: 16, alignItems: 'center' },
  card: { width: 300 },
  dailyTitle: { marginTop: 8 },
  dailyCopy: { marginTop: 8, minHeight: 54 },
  dailyFoot: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 40,
  },
  locked: { opacity: 0.92 },
  tagline: { marginTop: 2, minHeight: 36 },
  art: { width: '100%', height: 58, borderWidth: 3, borderColor: '#141b1b', marginBottom: 6, imageRendering: 'pixelated' } as ImageStyle,
  faces: { flexDirection: 'row', gap: 4, marginTop: 8 },
  face: { width: 38, height: 38, borderRadius: 3 },
  faceDark: { opacity: 0.35 },
  cardFoot: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 40,
  },
  star: { position: 'absolute', backgroundColor: '#fff3c4' },
});
