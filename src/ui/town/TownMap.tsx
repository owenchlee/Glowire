// The home screen: Glowtown at night. Districts run down a winding road; each job is a
// building that lights up when it's solved. Pip waits at your next job.

import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

import { TIERS, weekdayIndex } from '../../game/daily';
import { type SaveData, currentStreak, dayKey, isUnlocked, totalStars } from '../../game/save';
import { DISTRICTS, type District, PROLOGUE, type Scene } from '../../game/story';
import { CHAPTERS, LEVELS, levelNumber } from '../../levels/levels';
import type { ChapterDef, LevelDef } from '../../levels/types';
import { COLORS } from '../../render/theme';
import { Pip } from '../characters/Pip';
import { JOB_ORDER, starsFor, useGame } from '../game';
import { Button, Sparks, Stars, shadow } from '../kit';
import { SceneDialog } from '../SceneDialog';
import { Building } from './Building';
import { JobCard } from './JobCard';

const NODE_GAP = 150;
const HEADER = 120;
const XS = [0.3, 0.7, 0.36, 0.72, 0.28, 0.64];
const BUILDING = 96;

const solved = (save: SaveData, id: number) => starsFor(save, id) > 0;
const open = (save: SaveData, id: number) => isUnlocked(save, JOB_ORDER, id);
/** Opened by playing, not by the testing switch (story scenes wait for real progress). */
const reached = (save: SaveData, id: number) => open({ ...save, unlockAll: false }, id);

/** The next story scene the player hasn't seen, if any. */
function pendingScene(save: SaveData): Scene | null {
  if (!save.seen.includes(PROLOGUE.id)) return PROLOGUE;
  for (const d of DISTRICTS) {
    const chapter = CHAPTERS.find((c) => c.id === d.chapter)!;
    const first = chapter.levels[0]!.id;
    if (reached(save, first) && !save.seen.includes(d.intro.id)) return d.intro;
    if (chapter.levels.every((l) => solved(save, l.id)) && !save.seen.includes(d.outro.id))
      return d.outro;
  }
  return null;
}

export function TownMap() {
  const { save, markSeen, setUnlockAll } = useGame();
  const { width: screen } = useWindowDimensions();
  const width = Math.min(screen, 520);
  const [card, setCard] = useState<LevelDef | null>(null);
  const [settings, setSettings] = useState(false);
  const scroll = useRef<ScrollView>(null);
  const districtTop = useRef<Record<number, number>>({});

  const next = LEVELS.find((l) => open(save, l.id) && !solved(save, l.id));
  const lit = LEVELS.filter((l) => solved(save, l.id)).length;
  const scene = pendingScene(save);
  const today = dayKey(new Date());

  // Start the map scrolled to the next job.
  const scrolled = useRef(false);
  const scrollToNext = () => {
    if (scrolled.current || !next) return;
    const chapter = CHAPTERS.find((c) => c.levels.some((l) => l.id === next.id))!;
    const top = districtTop.current[chapter.id];
    if (top === undefined) return;
    const i = chapter.levels.findIndex((l) => l.id === next.id);
    scrolled.current = true;
    // The title stays in view for the first jobs; later on, the next job sits mid-screen.
    scroll.current?.scrollTo({
      y: Math.max(0, top + HEADER + i * NODE_GAP - 380),
      animated: false,
    });
  };

  return (
    <View style={styles.screen}>
      <SafeAreaView edges={['top']} style={styles.hudWrap}>
        <View style={styles.hud}>
          <Sparks amount={save.sparks} dark />
          <View style={styles.hudStars}>
            <Text style={styles.hudStar}>★</Text>
            <Text style={styles.hudText}>{totalStars(save)}</Text>
          </View>
          <View style={styles.flex} />
          <Button label="🛒 Shop" tone="#7a5ad6" onPress={() => router.push('/shop')} />
          <Pressable onPress={() => setSettings(true)} style={styles.gear} hitSlop={8}>
            <Text style={styles.gearText}>⚙︎</Text>
          </Pressable>
        </View>
      </SafeAreaView>

      <ScrollView ref={scroll} contentContainerStyle={{ alignItems: 'center', paddingBottom: 60 }}>
        <View style={{ width }}>
          <View style={styles.titleBlock}>
            <Text style={styles.title}>Glowtown</Text>
            <Text style={styles.subtitle}>
              {lit} of {LEVELS.length} lights back on
            </Text>
            <View style={styles.progress}>
              <View style={[styles.progressFill, { width: `${(lit / LEVELS.length) * 100}%` }]} />
            </View>
          </View>
          <DailyCard save={save} today={today} />
          {CHAPTERS.map((chapter) => (
            <View
              key={chapter.id}
              onLayout={(e) => {
                districtTop.current[chapter.id] = e.nativeEvent.layout.y;
                scrollToNext();
              }}
            >
              <DistrictBlock
                chapter={chapter}
                district={DISTRICTS.find((d) => d.chapter === chapter.id)!}
                width={width}
                save={save}
                nextId={next?.id}
                onOpen={setCard}
              />
            </View>
          ))}
          <View style={styles.footer}>
            <Pip size={64} mood="sleepy" hat={save.equipped.hat} />
            <Text style={styles.footerText}>
              More of Glowtown is still dark. New districts soon!
            </Text>
          </View>
        </View>
      </ScrollView>

      {card && (
        <JobCard
          level={card}
          earned={starsFor(save, card.id)}
          onClose={() => setCard(null)}
          onStart={() => {
            setCard(null);
            router.push(`/level/${card.id}`);
          }}
        />
      )}

      {settings && (
        <View style={styles.modalBackdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setSettings(false)} />
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Settings</Text>
            <View style={styles.settingRow}>
              <View style={styles.flex}>
                <Text style={styles.settingName}>Unlock every job</Text>
                <Text style={styles.settingHint}>For testing: play any job in any order.</Text>
              </View>
              <Switch value={save.unlockAll} onValueChange={setUnlockAll} />
            </View>
            <Button label="Done" primary onPress={() => setSettings(false)} />
          </View>
        </View>
      )}

      {scene && (
        <SceneDialog
          key={scene.id}
          scene={scene}
          hat={save.equipped.hat}
          onDone={() => markSeen(scene.id)}
        />
      )}
    </View>
  );
}

function DailyCard({ save, today }: { save: SaveData; today: string }) {
  const tier = TIERS[weekdayIndex(today)]!;
  const streak = currentStreak(save, today);
  const earned = save.daily.stars[today] ?? 0;
  return (
    <Pressable
      onPress={() => router.push('/daily')}
      style={({ pressed }) => [styles.daily, pressed && styles.pressed]}
    >
      <View style={styles.flex}>
        <Text style={styles.dailyKicker}>DAILY BLACKOUT · {tier.name.toUpperCase()}</Text>
        <Text style={styles.dailyTitle}>{earned ? 'Done for today!' : 'Emergency call!'}</Text>
        <Text style={styles.dailyText}>
          {streak > 0 ? `🔥 ${streak}-day streak` : 'Start a streak today'}
          {save.daily.best > 1 ? ` · best ${save.daily.best}` : ''}
        </Text>
      </View>
      {earned ? (
        <Stars earned={earned} size={20} dark />
      ) : (
        <Text style={styles.dailyGo}>Play ›</Text>
      )}
    </Pressable>
  );
}

function DistrictBlock({
  chapter,
  district,
  width,
  save,
  nextId,
  onOpen,
}: {
  chapter: ChapterDef;
  district: District;
  width: number;
  save: SaveData;
  nextId: number | undefined;
  onOpen: (level: LevelDef) => void;
}) {
  const levels = chapter.levels;
  const height = HEADER + levels.length * NODE_GAP + 30;
  const nodes = levels.map((l, i) => ({
    level: l,
    x: width * XS[i % XS.length]!,
    y: HEADER + i * NODE_GAP + 60,
  }));
  const locked = !open(save, levels[0]!.id);
  const done = levels.filter((l) => solved(save, l.id)).length;
  const stars = levels.reduce((s, l) => s + starsFor(save, l.id), 0);
  const gradId = `sky-${chapter.id}`;

  // Each road segment runs between two neighbouring jobs; it's lit once both are solved.
  const segments = nodes.slice(1).map((b, i) => {
    const a = nodes[i]!;
    const mid = (a.y + b.y) / 2;
    return {
      d: `M${a.x} ${a.y + 30} C${a.x} ${mid} ${b.x} ${mid} ${b.x} ${b.y + 30}`,
      lit: solved(save, a.level.id) && solved(save, b.level.id),
      lamp: { x: (a.x + b.x) / 2, y: mid + 30 },
    };
  });

  return (
    <View style={{ height, width }}>
      <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={district.sky[0]} />
            <Stop offset="1" stopColor={district.sky[1]} />
          </LinearGradient>
        </Defs>
        <Rect x={0} y={0} width={width} height={height} fill={`url(#${gradId})`} />
        {sprinkle(chapter.id, width, height).map((s, i) => (
          <Circle key={i} cx={s.x} cy={s.y} r={s.r} fill="#fff" opacity={s.o} />
        ))}
        {segments.map((s, i) => (
          <Path
            key={`road${i}`}
            d={s.d}
            stroke={s.lit ? '#6b5c7e' : '#3b3656'}
            strokeWidth={22}
            fill="none"
            strokeLinecap="round"
          />
        ))}
        {segments.map((s, i) => (
          <Path
            key={`line${i}`}
            d={s.d}
            stroke={s.lit ? '#ffd56b' : '#55507a'}
            strokeWidth={3}
            strokeDasharray="8 10"
            fill="none"
            opacity={s.lit ? 0.9 : 0.6}
          />
        ))}
        {segments.map((s, i) => (
          <Lamp key={`lamp${i}`} x={s.lamp.x + 20} y={s.lamp.y} lit={s.lit} />
        ))}
      </Svg>

      <View style={styles.districtHeader}>
        <Text style={styles.districtKicker}>DISTRICT {chapter.id}</Text>
        <Text style={styles.districtName}>{district.name}</Text>
        <Text style={styles.districtMeta}>
          {locked
            ? `🔒 Finish ${previousName(chapter.id)} first`
            : `${done}/${levels.length} lit · ★ ${stars}/${levels.length * 3}`}
        </Text>
      </View>

      {nodes.map(({ level, x, y }, i) => {
        const isOpen = open(save, level.id);
        const earned = starsFor(save, level.id);
        return (
          <View
            key={level.id}
            style={[styles.node, { left: x - BUILDING / 2, top: y - BUILDING / 2 }]}
          >
            <Pressable
              disabled={!isOpen}
              onPress={() => onOpen(level)}
              style={({ pressed }) => [styles.nodePress, pressed && styles.pressed]}
            >
              <Building
                kind={level.job!.building}
                lit={earned > 0}
                variant={level.id}
                size={BUILDING}
              />
              <View style={[styles.label, !isOpen && styles.labelLocked]}>
                <Text style={styles.labelNumber}>{isOpen ? levelNumber(level.id) : '🔒'}</Text>
                <Text style={styles.labelTitle} numberOfLines={1}>
                  {level.job!.place}
                </Text>
                {earned > 0 && <Stars earned={earned} size={11} />}
              </View>
            </Pressable>
            {level.id === nextId && (
              <NextMarker side={XS[i % XS.length]! > 0.5 ? 'left' : 'right'} />
            )}
          </View>
        );
      })}
    </View>
  );
}

function previousName(chapter: number): string {
  return DISTRICTS.find((d) => d.chapter === chapter - 1)?.name ?? 'the last district';
}

function Lamp({ x, y, lit }: { x: number; y: number; lit: boolean }) {
  return (
    <>
      {lit && <Circle cx={x} cy={y - 22} r={14} fill="#ffd56b" opacity={0.25} />}
      <Rect x={x - 1.5} y={y - 20} width={3} height={22} fill="#6d6680" />
      <Circle cx={x} cy={y - 22} r={4.5} fill={lit ? '#fff3b8' : '#4a4660'} />
    </>
  );
}

/** Pip waiting by the next job, with a bouncing "!" */
function NextMarker({ side }: { side: 'left' | 'right' }) {
  const bounce = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(bounce, {
          toValue: 1,
          duration: 450,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(bounce, {
          toValue: 0,
          duration: 450,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [bounce]);
  const translateY = bounce.interpolate({ inputRange: [0, 1], outputRange: [0, -8] });
  const { save } = useGame();
  return (
    <View
      pointerEvents="none"
      style={[styles.marker, side === 'left' ? { right: BUILDING - 8 } : { left: BUILDING - 8 }]}
    >
      <Animated.View style={[styles.bang, { transform: [{ translateY }] }]}>
        <Text style={styles.bangText}>!</Text>
      </Animated.View>
      <Pip size={58} hat={save.equipped.hat} />
    </View>
  );
}

/** Deterministic stars in the sky. */
function sprinkle(seed: number, width: number, height: number) {
  const out: { x: number; y: number; r: number; o: number }[] = [];
  let s = seed * 9301 + 49297;
  const rand = () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
  for (let i = 0; i < height / 18; i++) {
    out.push({
      x: rand() * width,
      y: rand() * height,
      r: 0.6 + rand() * 1.4,
      o: 0.25 + rand() * 0.6,
    });
  }
  return out;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#1d1b3a' },
  flex: { flex: 1 },
  pressed: { transform: [{ scale: 0.96 }] },
  hudWrap: { backgroundColor: '#1d1b3a', zIndex: 10 },
  hud: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  hudStars: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingVertical: 5,
    paddingHorizontal: 11,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  hudStar: { color: '#ffc93c', fontSize: 15 },
  hudText: { color: '#fff', fontWeight: '900', fontSize: 15 },
  gear: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  gearText: { color: '#fff', fontSize: 20 },
  titleBlock: { alignItems: 'center', paddingTop: 8, paddingBottom: 14 },
  title: { fontSize: 38, fontWeight: '900', color: '#fff3b8' },
  subtitle: { fontSize: 14, fontWeight: '700', color: '#b9b0d9' },
  progress: {
    marginTop: 8,
    width: 200,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.12)',
    overflow: 'hidden',
  },
  progressFill: { height: 8, borderRadius: 4, backgroundColor: '#ffd56b' },
  daily: {
    marginHorizontal: 16,
    marginBottom: 18,
    padding: 16,
    borderRadius: 22,
    backgroundColor: '#e2574c',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    ...shadow,
  },
  dailyKicker: { fontSize: 11, fontWeight: '900', color: '#ffd9d2', letterSpacing: 1 },
  dailyTitle: { fontSize: 20, fontWeight: '900', color: '#fff' },
  dailyText: { fontSize: 13, fontWeight: '700', color: '#ffe6e1' },
  dailyGo: { fontSize: 18, fontWeight: '900', color: '#fff' },
  districtHeader: { alignItems: 'center', paddingTop: 22 },
  districtKicker: { fontSize: 11, fontWeight: '900', color: '#b9b0d9', letterSpacing: 2 },
  districtName: { fontSize: 28, fontWeight: '900', color: '#fff' },
  districtMeta: { fontSize: 13, fontWeight: '700', color: '#d7cff0' },
  node: { position: 'absolute', width: BUILDING, alignItems: 'center' },
  nodePress: { alignItems: 'center' },
  label: {
    marginTop: -6,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 12,
    backgroundColor: 'rgba(255,250,244,0.95)',
    alignItems: 'center',
    maxWidth: 150,
  },
  labelLocked: { backgroundColor: 'rgba(255,255,255,0.18)' },
  labelNumber: { fontSize: 12, fontWeight: '900', color: COLORS.text },
  labelTitle: { fontSize: 10, fontWeight: '700', color: COLORS.textSoft },
  marker: { position: 'absolute', top: 6, alignItems: 'center' },
  bang: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#ffd56b',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: -4,
  },
  bangText: { fontWeight: '900', color: '#3a3346', fontSize: 15 },
  footer: { alignItems: 'center', padding: 30, gap: 8 },
  footerText: { color: '#b9b0d9', fontWeight: '700', textAlign: 'center' },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(20,16,38,0.6)',
    justifyContent: 'center',
    padding: 24,
    zIndex: 40,
  },
  modal: { borderRadius: 24, padding: 20, backgroundColor: COLORS.card, gap: 16 },
  modalTitle: { fontSize: 22, fontWeight: '900', color: COLORS.text },
  settingRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  settingName: { fontSize: 16, fontWeight: '800', color: COLORS.text },
  settingHint: { fontSize: 13, fontWeight: '600', color: COLORS.textSoft },
});
