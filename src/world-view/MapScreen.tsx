// The town map: a clean, stylised night map of the world (roads, water, buildings), fogged
// where the hero hasn't been, with the hero, the next place to go, the job doors and the
// area names marked. Opened from the world screen; closes with M, Escape or a tap.

import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Image, Platform, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';

import { PixelButton, PixelText, CREAM, GOLD, INK, NIGHT_DEEP, TEAL } from '../ui/pixel';
import { type Solved, openAreas } from '../world/logic';
import type { Point, WorldMap } from '../world/types';
import { type Explored, isExplored, nextGoal, toBase64 } from './explored';
import { bmpBase64, paintMap } from './mapPaint';

/** Image pixels per cell: enough for outlines; the screen scales it up from there. */
const PAINT = 6;
/** Screen size of one cell at each zoom step. */
const ZOOMS = [4, 6, 9, 12, 18];
const NATIVE = Platform.OS !== 'web';

interface Props {
  map: WorldMap;
  /** What the hero has seen (see explored.ts). Read once when the map opens. */
  explored: Explored;
  solved: Solved;
  /** The hero's cell (fractions are fine). */
  hero: Point;
  onClose: () => void;
}

function useLoop(duration: number) {
  const [v] = useState(() => new Animated.Value(0));
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(v, { toValue: 1, duration, easing: Easing.inOut(Easing.quad), useNativeDriver: NATIVE }),
        Animated.timing(v, { toValue: 0, duration, easing: Easing.inOut(Easing.quad), useNativeDriver: NATIVE }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [v, duration]);
  return v;
}

export function MapScreen({ map, explored, solved, hero, onClose }: Props) {
  const { width: screenW, height: screenH } = useWindowDimensions();
  const viewH = screenH - 90;
  const [zoom, setZoom] = useState(() => {
    let z = 0;
    while (z + 1 < ZOOMS.length && map.height * ZOOMS[z + 1]! <= viewH) z++;
    return z;
  });
  const cell = ZOOMS[zoom]!;
  const W = map.width * cell;
  const H = map.height * cell;

  const uri = useMemo(
    () => `data:image/bmp;base64,${bmpBase64(paintMap(map, explored, solved, PAINT), toBase64)}`,
    [map, explored, solved],
  );
  const goal = useMemo(() => nextGoal(map, solved, explored), [map, solved, explored]);
  const open = openAreas(map, solved);
  const seen = (x: number, y: number) => isExplored(explored, map, x, y);

  // Area names sit in the middle of each area's cells.
  const labels = useMemo(() => {
    const box = map.areas.map(() => ({ x0: Infinity, y0: Infinity, x1: -1, y1: -1, seen: false }));
    for (let y = 0; y < map.height; y++)
      for (let x = 0; x < map.width; x++) {
        const b = box[map.areaOf[y * map.width + x]!];
        if (!b) continue;
        b.x0 = Math.min(b.x0, x);
        b.y0 = Math.min(b.y0, y);
        b.x1 = Math.max(b.x1, x);
        b.y1 = Math.max(b.y1, y);
        b.seen ||= isExplored(explored, map, x, y);
      }
    return box.map((b, i) => ({ ...b, name: map.areas[i]!.name, cx: (b.x0 + b.x1 + 1) / 2, cy: (b.y0 + b.y1 + 1) / 2 }));
  }, [map, explored]);

  const jobs = map.spots.flatMap((s) =>
    s.kind === 'job' && seen(s.x, s.y) && (map.areaOf[s.y * map.width + s.x] ?? 255) < open ? [{ ...s, lit: solved(s.job) }] : [],
  );
  const exits = map.spots.filter((s) => s.kind === 'exit' && seen(s.x, s.y));

  const blink = useLoop(450);
  const pulse = useLoop(700);

  // Start centred on the hero, and stay on them when zooming.
  const vScroll = useRef<ScrollView>(null);
  const hScroll = useRef<ScrollView>(null);
  useEffect(() => {
    const id = setTimeout(() => {
      hScroll.current?.scrollTo({ x: Math.max(0, (hero.x + 0.5) * cell - screenW / 2), animated: false });
      vScroll.current?.scrollTo({ y: Math.max(0, (hero.y + 0.5) * cell - viewH / 2), animated: false });
    }, 0);
    return () => clearTimeout(id);
  }, [cell, hero.x, hero.y, screenW, viewH]);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const down = (e: KeyboardEvent) => {
      if (['m', 'M', 'Escape'].includes(e.key)) onClose();
      else if (e.key === '+' || e.key === '=') setZoom((z) => Math.min(ZOOMS.length - 1, z + 1));
      else if (e.key === '-') setZoom((z) => Math.max(0, z - 1));
      else return;
      e.preventDefault();
    };
    window.addEventListener('keydown', down);
    return () => window.removeEventListener('keydown', down);
  }, [onClose]);

  const dot = Math.max(8, cell);
  const place = (p: Point, size: number) => ({
    left: (p.x + 0.5) * cell - size / 2,
    top: (p.y + 0.5) * cell - size / 2,
    width: size,
    height: size,
  });

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <View style={styles.title}>
          <PixelText size={16} color={GOLD} shadow numberOfLines={1}>
            {map.name}
          </PixelText>
          <PixelText size={12} color={CREAM} shadow numberOfLines={1}>
            {goal ? `Next: ${goal.label}` : 'Every light is on!'}
          </PixelText>
        </View>
        <PixelText size={11} color="#c9c3e6" shadow style={styles.legend}>
          {'■ you  ★ next  ✦ lit  ○ job'}
        </PixelText>
        <PixelButton label="−" tone="cream" size={14} disabled={zoom === 0} onPress={() => setZoom(zoom - 1)} />
        <PixelButton label="+" tone="cream" size={14} disabled={zoom === ZOOMS.length - 1} onPress={() => setZoom(zoom + 1)} />
        <PixelButton label="Close" tone="teal" size={13} onPress={onClose} />
      </View>

      <ScrollView ref={vScroll} style={styles.flex} contentContainerStyle={styles.center}>
        <ScrollView ref={hScroll} horizontal contentContainerStyle={styles.center}>
          <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Close the map">
            <View style={[styles.frame, { width: W + 6, height: H + 6 }]}>
              <Image source={{ uri }} style={[{ width: W, height: H }, Platform.OS === 'web' && WEB_PIXELATED]} />

              {labels.map(
                (l) =>
                  l.x1 >= 0 &&
                  (l.seen || cell >= 9) && (
                    <View key={l.name} pointerEvents="none" style={[styles.label, { left: l.cx * cell - 80, top: l.y0 * cell + 6 }]}>
                      <PixelText size={cell >= 9 ? 13 : 10} color={l.seen ? CREAM : '#5d6290'} shadow numberOfLines={1}>
                        {l.seen ? l.name : '???'}
                      </PixelText>
                    </View>
                  ),
              )}

              {jobs.map((j) => (
                <View key={`j${j.job}`} pointerEvents="none" style={[styles.marker, place(j, dot)]}>
                  <PixelText size={dot} color={j.lit ? GOLD : CREAM} shadow>
                    {j.lit ? '✦' : '○'}
                  </PixelText>
                </View>
              ))}
              {exits.map((s) => (
                <View key={`e${s.x},${s.y}`} pointerEvents="none" style={[styles.exit, place(s, dot)]} />
              ))}

              {goal && (
                <Animated.View
                  pointerEvents="none"
                  style={[
                    styles.marker,
                    place(goal, dot * 2),
                    { transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1.25] }) }] },
                  ]}
                >
                  <PixelText size={dot * 2} color={GOLD} shadow>
                    ★
                  </PixelText>
                </Animated.View>
              )}
              {goal && (
                <View pointerEvents="none" style={[styles.goalTag, { left: (goal.x + 0.5) * cell - 80, top: (goal.y + 0.5) * cell + dot }]}>
                  <PixelText size={11} color={GOLD} shadow numberOfLines={1}>
                    {goal.label}
                  </PixelText>
                </View>
              )}

              <Animated.View
                pointerEvents="none"
                style={[styles.hero, place(hero, dot), { opacity: blink.interpolate({ inputRange: [0, 1], outputRange: [1, 0.15] }) }]}
              />
            </View>
          </Pressable>
        </ScrollView>
      </ScrollView>
    </View>
  );
}

// react-native-web passes this CSS through, so the map scales up in sharp pixels, not a blur.
const WEB_PIXELATED = { imageRendering: 'pixelated' } as object;

const styles = StyleSheet.create({
  screen: { ...StyleSheet.absoluteFill, backgroundColor: NIGHT_DEEP },
  flex: { flex: 1 },
  // Auto margins centre a small map; flex centring would push a big one off the scrollable area.
  center: { flexGrow: 1, padding: 12 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 8,
    borderBottomWidth: 2,
    borderBottomColor: INK,
    backgroundColor: '#1b1f3b',
  },
  title: { flex: 1, minWidth: 0 },
  legend: { flexShrink: 1 },
  frame: { margin: 'auto', borderWidth: 3, borderColor: TEAL, backgroundColor: INK },
  label: { position: 'absolute', width: 160, alignItems: 'center' },
  goalTag: {
    position: 'absolute',
    width: 160,
    alignItems: 'center',
  },
  marker: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  exit: { position: 'absolute', backgroundColor: TEAL, borderWidth: 2, borderColor: INK },
  hero: { position: 'absolute', backgroundColor: CREAM, borderWidth: 2, borderColor: INK },
});
