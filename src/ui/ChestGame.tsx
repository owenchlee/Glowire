// Chest minigames, shown over the world when a chest wants a little skill to open:
// Keyhole (stop the sliding key over the lock) or Mash (mash X to pry the lid). No fail
// state: a miss just shakes, the keyhole widens a little, and you go again.

import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Platform, Pressable, StyleSheet, View } from 'react-native';

import {
  type ChestGameKind,
  MASH_MS,
  keyHits,
  keyPos,
  keySpeed,
  keyholeCentre,
  keyholeWidth,
  mashPress,
  mashTick,
} from './chestGames';
import { buzz } from './haptics';
import { BROWN, CREAM, GOLD, GOLD_DARK, GREEN, INK, ORANGE_DARK, Panel, PixelButton, PixelText, RED, TEXT, TEXT_SOFT } from './pixel';

const WEB = Platform.OS === 'web';
const TRACK_W = 240;
const KEY_W = 20;
const WIN_PAUSE_MS = 700;

/** Listens on window in the capture phase and stops the event, so the world's own handler never sees it. */
function useKeys(handle: (key: string, repeat: boolean) => boolean) {
  useEffect(() => {
    if (!WEB) return;
    const down = (e: KeyboardEvent) => {
      if (!handle(e.key, e.repeat)) return;
      e.preventDefault();
      e.stopPropagation();
    };
    window.addEventListener('keydown', down, true);
    return () => window.removeEventListener('keydown', down, true);
  }, [handle]);
}

/** Calls onWin after a short pause, unless the game has gone away by then. */
function useWinLater(onWin: () => void) {
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  return useCallback(() => {
    timer.current = setTimeout(onWin, WIN_PAUSE_MS);
  }, [onWin]);
}

export function ChestGame({
  kind,
  difficulty,
  onWin,
  onClose,
}: {
  kind: ChestGameKind;
  /** 0 (easy) to 1 (hard); see chestDifficulty(sparks). */
  difficulty: number;
  onWin: () => void;
  onClose: () => void;
}) {
  return (
    <View style={styles.cover}>
      <Panel style={styles.panel}>
        <PixelText size={16} color={TEXT} style={styles.center}>
          {kind === 'keyhole' ? 'A locked chest!' : 'A stuck chest!'}
        </PixelText>
        {kind === 'keyhole' ? (
          <Keyhole difficulty={difficulty} onWin={onWin} onClose={onClose} />
        ) : (
          <Mash difficulty={difficulty} onWin={onWin} onClose={onClose} />
        )}
      </Panel>
    </View>
  );
}

// ── Keyhole ──────────────────────────────────────────────────────────────────

function Keyhole({ difficulty, onWin, onClose }: { difficulty: number; onWin: () => void; onClose: () => void }) {
  const speed = keySpeed(difficulty);
  const [centre] = useState(() => keyholeCentre(Math.random()));
  const [misses, setMisses] = useState(0);
  const [phase, setPhase] = useState<'play' | 'miss' | 'win'>('play');
  const [pos] = useState(() => new Animated.Value(0));
  const [shake] = useState(() => new Animated.Value(0));
  const [insert] = useState(() => new Animated.Value(0));
  const live = useRef(true);
  const shown = useRef(0);
  const elapsed = useRef(0);
  const winLater = useWinLater(onWin);
  const width = keyholeWidth(difficulty, misses);

  // Slide the key; after a miss it carries on from where it stopped.
  useEffect(() => {
    if (phase !== 'play') return;
    live.current = true;
    const t0 = performance.now() - elapsed.current;
    let raf = 0;
    const frame = (t: number) => {
      elapsed.current = t - t0;
      shown.current = keyPos(elapsed.current, speed);
      pos.setValue(shown.current);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [phase, speed, pos]);

  const stop = useCallback(() => {
    if (!live.current) return;
    live.current = false;
    // Judge what the player saw on screen, not where the clock says the key is now.
    if (keyHits(shown.current, centre, width)) {
      setPhase('win');
      buzz.win();
      Animated.timing(insert, { toValue: 1, duration: 260, useNativeDriver: true }).start(winLater);
      return;
    }
    setPhase('miss');
    buzz.oops();
    Animated.sequence(
      [8, -8, 6, -6, 3, 0].map((toValue) => Animated.timing(shake, { toValue, duration: 50, useNativeDriver: true })),
    ).start(() => {
      setMisses((m) => m + 1);
      setPhase('play');
    });
  }, [centre, width, insert, shake, winLater]);

  const onKey = useCallback(
    (key: string, repeat: boolean) => {
      if ([' ', 'e', 'E', 'Enter'].includes(key)) {
        if (!repeat) stop();
        return true;
      }
      if (key === 'Escape' && phase !== 'win') {
        onClose();
        return true;
      }
      return false;
    },
    [stop, phase, onClose],
  );
  useKeys(onKey);

  const keyX = pos.interpolate({ inputRange: [0, 1], outputRange: [-KEY_W / 2, TRACK_W - KEY_W / 2] });
  const keyY = insert.interpolate({ inputRange: [0, 1], outputRange: [0, 16] });
  const plateW = width * TRACK_W;

  return (
    <>
      <Pressable accessibilityRole="button" accessibilityLabel="Stop the key" onPressIn={stop} style={styles.stage}>
        <Animated.View style={[styles.track, { transform: [{ translateX: shake }] }]}>
          <View style={styles.rail} />
          <View
            style={[
              styles.plate,
              { left: centre * TRACK_W - plateW / 2, width: plateW },
              phase === 'win' && { backgroundColor: GREEN },
            ]}
          >
            <View style={styles.holeTop} />
            <View style={styles.holeSlot} />
          </View>
          <Animated.View style={[styles.keyWrap, { transform: [{ translateX: keyX }] }]}>
            <Animated.View style={{ alignItems: 'center', transform: [{ translateY: keyY }] }}>
              <View style={styles.bow}>
                <View style={styles.bowHole} />
              </View>
              <View style={styles.shaft}>
                <View style={[styles.tooth, { top: 14 }]} />
                <View style={[styles.tooth, { top: 22, width: 4 }]} />
              </View>
            </Animated.View>
          </Animated.View>
        </Animated.View>
      </Pressable>
      <PixelText size={13} color={phase === 'miss' ? RED : phase === 'win' ? GOLD_DARK : TEXT_SOFT} style={styles.center}>
        {phase === 'win'
          ? 'Click! It opens!'
          : phase === 'miss'
            ? 'Clunk! Not quite…'
            : misses > 0
              ? 'Try again! The lock looks a bit bigger now.'
              : WEB
                ? 'Stop the key over the lock! Space, E or tap.'
                : 'Tap to stop the key over the lock!'}
      </PixelText>
      <View style={styles.row}>
        <PixelButton label="Stop!" tone="orange" size={15} onPress={stop} disabled={phase !== 'play'} />
        <PixelButton label="Leave it" tone="cream" size={13} onPress={onClose} disabled={phase === 'win'} />
      </View>
    </>
  );
}

// ── Mash ─────────────────────────────────────────────────────────────────────

function Mash({ difficulty, onWin, onClose }: { difficulty: number; onWin: () => void; onClose: () => void }) {
  const [phase, setPhase] = useState<'play' | 'stuck' | 'win'>('play');
  const [run, setRun] = useState(0);
  const [secs, setSecs] = useState(MASH_MS / 1000);
  const [meter] = useState(() => new Animated.Value(0));
  const fill = useRef(0);
  const live = useRef(true);
  const winLater = useWinLater(onWin);

  // Drain the meter and run the clock.
  useEffect(() => {
    if (phase !== 'play') return;
    live.current = true;
    fill.current = 0;
    meter.setValue(0);
    const t0 = performance.now();
    let last = t0;
    let raf = 0;
    const frame = (t: number) => {
      if (!live.current) return;
      fill.current = mashTick(fill.current, t - last, difficulty);
      last = t;
      meter.setValue(fill.current);
      setSecs(Math.max(0, Math.ceil((MASH_MS - (t - t0)) / 1000)));
      if (t - t0 >= MASH_MS) {
        live.current = false;
        setPhase('stuck');
        buzz.oops();
        return;
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [phase, run, difficulty, meter]);

  const press = useCallback(() => {
    if (!live.current) return;
    fill.current = mashPress(fill.current, difficulty);
    meter.setValue(fill.current);
    if (fill.current < 1) return buzz.tap();
    live.current = false;
    setPhase('win');
    buzz.win();
    winLater();
  }, [difficulty, meter, winLater]);

  const retry = useCallback(() => {
    setSecs(MASH_MS / 1000);
    setRun((r) => r + 1);
    setPhase('play');
  }, []);

  const onKey = useCallback(
    (key: string, repeat: boolean) => {
      if (key === 'x' || key === 'X') {
        if (!repeat) press();
        return true;
      }
      if ([' ', 'e', 'E', 'Enter'].includes(key)) {
        if (phase === 'stuck' && !repeat) retry();
        return true;
      }
      if (key === 'Escape' && phase !== 'win') {
        onClose();
        return true;
      }
      return false;
    },
    [press, retry, phase, onClose],
  );
  useKeys(onKey);

  const fillW = meter.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });
  const lidY = meter.interpolate({ inputRange: [0, 1], outputRange: [0, -7] });

  return (
    <>
      <View style={styles.stage}>
        <View style={styles.chest}>
          <Animated.View style={[styles.lid, { transform: [{ translateY: phase === 'win' ? -16 : lidY }] }]} />
          <View style={styles.chestBody}>
            <View style={styles.latch} />
          </View>
        </View>
      </View>
      <View style={styles.meter}>
        <Animated.View style={[styles.meterFill, { width: fillW }]} />
      </View>
      <PixelText size={13} color={phase === 'stuck' ? RED : phase === 'win' ? GOLD_DARK : TEXT_SOFT} style={styles.center}>
        {phase === 'win'
          ? 'Pop! The lid flies open!'
          : phase === 'stuck'
            ? 'Phew, still stuck. Have another go!'
            : `${WEB ? 'Mash X' : 'Mash the button'} to pry it open! ${secs}s`}
      </PixelText>
      <View style={styles.row}>
        {phase === 'stuck' ? (
          <PixelButton label="Try again" tone="orange" size={15} onPress={retry} />
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Mash"
            onPressIn={press}
            disabled={phase !== 'play'}
            style={({ pressed }) => [styles.mash, pressed && styles.mashDown]}
          >
            <PixelText size={18} color={CREAM} shadow>
              {WEB ? 'Mash X!' : 'MASH!'}
            </PixelText>
          </Pressable>
        )}
        <PixelButton label="Leave it" tone="cream" size={13} onPress={onClose} disabled={phase === 'win'} />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  cover: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(8,9,20,0.45)',
  },
  panel: { width: 300 },
  center: { textAlign: 'center', marginVertical: 4 },
  row: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10, marginTop: 4 },
  stage: { height: 96, alignItems: 'center', justifyContent: 'center' },
  track: { width: TRACK_W, height: 96 },
  rail: { position: 'absolute', left: 0, right: 0, top: 62, height: 12, backgroundColor: BROWN, borderWidth: 2, borderColor: INK },
  plate: {
    position: 'absolute',
    top: 52,
    height: 32,
    backgroundColor: GOLD,
    borderWidth: 2,
    borderColor: INK,
    alignItems: 'center',
    paddingTop: 5,
  },
  holeTop: { width: 8, height: 8, borderRadius: 4, backgroundColor: INK },
  holeSlot: { width: 4, height: 9, marginTop: -2, backgroundColor: INK },
  keyWrap: { position: 'absolute', top: 2, width: KEY_W, alignItems: 'center' },
  bow: {
    width: KEY_W,
    height: 18,
    backgroundColor: GOLD,
    borderWidth: 2,
    borderColor: INK,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bowHole: { width: 6, height: 6, backgroundColor: INK },
  shaft: { width: 6, height: 30, marginTop: -2, backgroundColor: GOLD, borderWidth: 2, borderColor: INK, borderTopWidth: 0 },
  tooth: { position: 'absolute', left: 4, width: 6, height: 4, backgroundColor: GOLD, borderWidth: 1, borderColor: INK },
  chest: { width: 84, alignItems: 'center', marginTop: 16 },
  lid: { width: 84, height: 24, backgroundColor: ORANGE_DARK, borderWidth: 3, borderColor: INK, borderTopLeftRadius: 8, borderTopRightRadius: 8 },
  chestBody: {
    width: 84,
    height: 38,
    marginTop: -3,
    backgroundColor: BROWN,
    borderWidth: 3,
    borderColor: INK,
    alignItems: 'center',
  },
  latch: { width: 14, height: 14, marginTop: -2, backgroundColor: GOLD, borderWidth: 2, borderColor: INK },
  meter: { height: 18, marginVertical: 6, backgroundColor: INK, borderWidth: 2, borderColor: INK, overflow: 'hidden' },
  meterFill: { height: '100%', backgroundColor: GOLD },
  mash: {
    paddingHorizontal: 26,
    paddingTop: 12,
    paddingBottom: 10,
    backgroundColor: RED,
    borderWidth: 2,
    borderColor: INK,
    borderBottomWidth: 6,
    borderRadius: 6,
  },
  mashDown: { borderBottomWidth: 2, marginTop: 4 },
});
