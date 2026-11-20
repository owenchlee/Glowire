// Story: pick a world. Each world is its own town with its own jobs, one stop on the journey
// to find out where the light went. (The home screen is TitleScreen.)

import { router } from 'expo-router';
import { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, Image, type ImageStyle, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { totalStars } from '../game/save';
import { CHAPTERS } from '../levels/levels';
import { WORLDS, type WorldInfo } from '../world/worlds';
import { FACES } from './faces.generated';
import { starsFor, useGame } from './game';
import { metKey } from '../world-view/targets';
import { CREAM, Counter, GOLD, NIGHT_DEEP, Panel, PixelButton, PixelText, TEXT_SOFT } from './pixel';
import { Rise } from './TitleParts';

/**
 * A corner of each world at full pixel size for its card, made with
 * `MAP_IDS=<id> MAP_CROP=0,16,24,14 MAP_SCALE=1 npm run map-preview` (rows differ per world).
 */
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
          <PixelButton label="‹ Home" tone="teal" size={13} onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
          <View>
            <PixelText size={30} color={GOLD} shadow>
              Story
            </PixelText>
            <PixelText size={13} color="#c9c3e6" shadow>
              Every light in the world went out at once. Start in Glowtown and follow the trail.
            </PixelText>
          </View>
          <View style={styles.flex} />
          <Counter icon="⚡" value={save.sparks} />
          <Counter icon="★" value={totalStars(save)} />
        </View>
        <ScrollView horizontal contentContainerStyle={styles.row} showsHorizontalScrollIndicator={false}>
          {WORLDS.map((w, i) => (
            <Rise key={w.id} index={i}>
              <WorldCard world={w} number={i + 1} />
            </Rise>
          ))}
        </ScrollView>
      </SafeAreaView>
    </View>
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
        {faces.map((f) =>
          // A mystery until they've spoken to you (or you've already done one of their jobs).
          save.seen.includes(metKey(f)) || jobs.some((l) => l.job!.client === f && starsFor(save, l.id) > 0) ? (
            <Image accessible={false} key={f} source={FACES[f]} style={[styles.face, !open && styles.faceDark]} />
          ) : (
            <View key={f} style={[styles.face, styles.mystery]}>
              <PixelText size={20} color={CREAM}>
                ?
              </PixelText>
            </View>
          ),
        )}
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
  row: { gap: 22, paddingHorizontal: 20, paddingVertical: 16, alignItems: 'center', justifyContent: 'center', flexGrow: 1 },
  card: { width: 340 },
  locked: { opacity: 0.92 },
  tagline: { marginTop: 2, minHeight: 36 },
  art: { width: '100%', height: 180, borderWidth: 3, borderColor: '#141b1b', marginBottom: 8, imageRendering: 'pixelated' } as ImageStyle,
  faces: { flexDirection: 'row', gap: 4, marginTop: 8 },
  face: { width: 38, height: 38, borderRadius: 3 },
  faceDark: { opacity: 0.35 },
  mystery: { backgroundColor: NIGHT_DEEP, alignItems: 'center', justifyContent: 'center' },
  cardFoot: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 40,
  },
  star: { position: 'absolute', backgroundColor: '#fff3c4' },
});
