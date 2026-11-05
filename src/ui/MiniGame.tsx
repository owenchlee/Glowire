// A mini-game, opened from somewhere in a world: Ms. Ito's Colour Code blackboard, Old Gus's
// Signal Lamp, Moth's Needle Drop or Pearl's Jar Catch. Left: the host, how to play, your
// score and best. Right: the game itself.

import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { type GestureResponderEvent, Platform, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  BAND_NAMES,
  COLOUR_ROUNDS,
  COLOUR_TIME,
  type ColourQuestion,
  type Drop,
  GAMES,
  type GameId,
  JAR_SECONDS,
  JAR_SIZE,
  type LampColour,
  NEEDLE_RESISTORS,
  NEEDLE_ROUNDS,
  NEEDLE_TIME,
  type NeedleQuestion,
  colourPoints,
  colourQuestion,
  dropGap,
  formatOhms,
  needleQuestion,
  nextDrop,
  rng,
} from '../game/games';
import { brainDaily, brainStars } from '../game/dailyBrain';
import { SECRETS, earnedPuzzleSecrets, secretKey } from '../game/lore';
import { recordBrainDaily, recordGame } from '../game/save';
import { speakerName } from './Dialog';
import { SignalLamp } from './SignalLamp';
import { ClockPanel, DeadLampHunt, DockyardWiring, LanternBudget } from './BrainGames';
import { useGame } from './game';
import { buzz } from './haptics';
import { CREAM, Counter, GOLD, GREEN, INK, NIGHT, NIGHT_DEEP, NameTab, Panel, PixelButton, PixelText, Portrait, RED } from './pixel';

/** Band colours on the board's palette, digit 0 to 9. */
const BAND_HEX = ['#242118', '#7b4930', '#d14b34', '#e67c44', '#ffe166', '#74a334', '#3da6bd', '#a5608b', '#8d977f', '#f2eaf1'];

type Done = { score: number; earned: number; best: number; stars?: number; bonus?: number; news: string[] };

/** With `day`, this is the Daily Brain Teaser: today's seed, scored in stars. */
export function MiniGame({ id, day }: { id: GameId; day?: string }) {
  const info = GAMES[id];
  const { save, commitSave, markSeen } = useGame();
  const teaser = useMemo(() => (day ? brainDaily(day) : null), [day]);
  const [phase, setPhase] = useState<'intro' | 'play' | 'done'>('intro');
  const [done, setDone] = useState<Done | null>(null);
  const [say, setSay] = useState(info.how);
  const [run, setRun] = useState(0);
  const best = save.games[id] ?? 0;

  const finish = useCallback(
    (score: number) => {
      // One write for everything this result changes: best score, daily, new journal pages.
      const payout = recordGame(save, id, score);
      let next = payout.save;
      let stars: number | undefined;
      let bonus: number | undefined;
      if (teaser) {
        stars = brainStars(teaser, score);
        const daily = recordBrainDaily(next, teaser.day, stars, Math.random);
        next = daily.save;
        bonus = daily.earned;
      }
      const lore = earnedPuzzleSecrets(next.games, next.seen, id);
      if (lore.length) next = { ...next, seen: [...next.seen, ...lore.map((l) => secretKey(l.id))] };
      if (next !== save) commitSave(next);
      if (payout.earned > 0 || (bonus ?? 0) > 0) buzz.win();
      setDone({
        score,
        earned: payout.earned,
        best: Math.max(best, score),
        stars,
        bonus,
        news: lore.map((l) => l.title),
      });
      setPhase('done');
    },
    [save, commitSave, id, best, teaser],
  );

  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/'));

  const start = () => {
    // A new seed every game (this runs on a tap, not while drawing).
    setRun(teaser ? teaser.seed : Date.now() & 0x7fffffff);
    setDone(null);
    setPhase('play');
  };

  return (
    <SafeAreaView style={styles.screen} edges={['left', 'right']}>
      <View style={styles.side}>
        <View style={styles.row}>
          <PixelButton label="‹" tone="cream" size={16} onPress={goBack} />
          <PixelText size={18} color={GOLD} shadow style={styles.flex}>
            {teaser ? `Daily: ${info.title}` : info.title}
          </PixelText>
        </View>
        <View style={styles.row}>
          <Counter icon="★" value={`Best ${best}`} />
          <Counter icon="⚡" value={save.sparks} />
        </View>
        <View style={styles.flex} />
        <Portrait who={info.host} size={64} />
        <View>
          <NameTab name={speakerName(info.host)} />
          <Panel>
            <PixelText size={12}>{say}</PixelText>
          </Panel>
        </View>
      </View>

      <View style={styles.main}>
        {phase === 'intro' && (
          <View style={styles.center}>
            <PixelText size={14} color={CREAM} shadow style={styles.centerText}>
              {teaser
                ? `Today's Brain Teaser! ★ ${teaser.targets[0]}  ★★ ${teaser.targets[1]}  ★★★ ${teaser.targets[2]} points. Same puzzle for everyone today.`
                : 'Beat your best score to earn sparks: ⚡3 for every point.'}
            </PixelText>
            <PixelButton label="Start!" tone="orange" size={18} onPress={start} />
          </View>
        )}
        {phase === 'play' && id === 'colours' && <ColourCode key={run} seed={run} onSay={setSay} onEnd={finish} />}
        {phase === 'play' && id === 'needle' && <NeedleDrop key={run} seed={run} onSay={setSay} onEnd={finish} />}
        {phase === 'play' && id === 'probe' && <DeadLampHunt key={run} seed={run} onSay={setSay} onEnd={finish} />}
        {phase === 'play' && id === 'pipes' && <DockyardWiring key={run} seed={run} onSay={setSay} onEnd={finish} />}
        {phase === 'play' && id === 'panel' && <ClockPanel key={run} seed={run} onSay={setSay} onEnd={finish} />}
        {phase === 'play' && id === 'lantern' && <LanternBudget key={run} seed={run} onSay={setSay} onEnd={finish} />}
        {phase === 'play' && id === 'jars' && <JarCatch key={run} seed={run} onSay={setSay} onEnd={finish} />}
        {phase === 'play' && id === 'signal' && (
          <SignalLamp
            key={run}
            seed={run}
            onSay={setSay}
            onEnd={finish}
            onSeaAnswer={() => {
              setSay(SECRETS['sea-answer']!.lines.map((l) => l.text).join(' '));
              markSeen(secretKey('sea-answer'));
            }}
          />
        )}
        {phase === 'done' && done && (
          <View style={styles.center}>
            <PixelText size={22} color={GOLD} shadow>
              Score: {done.score}
            </PixelText>
            <PixelText size={14} color={CREAM} shadow style={styles.centerText}>
              {done.earned > 0 ? `New best! ⚡${done.earned} sparks.` : `Your best is ${done.best}. So close!`}
            </PixelText>
            {done.stars !== undefined && (
              <PixelText size={done.stars > 0 ? 24 : 14} color={GOLD} shadow style={styles.centerText}>
                {done.stars > 0
                  ? `${'★'.repeat(done.stars)}${'☆'.repeat(3 - done.stars)}${done.bonus ? `
⚡${done.bonus} sparks` : ''}`
                  : 'Daily: no stars yet. Try again, it is the same puzzle!'}
              </PixelText>
            )}
            {done.news.map((t) => (
              <PixelText key={t} size={13} color={CREAM} shadow style={styles.centerText}>
                {`New journal page: ${t}`}
              </PixelText>
            ))}
            <View style={styles.row}>
              <PixelButton label="Play again" tone="orange" size={15} onPress={start} />
              <PixelButton label="Back to town" tone="cream" size={15} onPress={goBack} />
            </View>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

// ── Colour Code ──────────────────────────────────────────────────────────────

function ColourCode({ seed, onSay, onEnd }: { seed: number; onSay: (s: string) => void; onEnd: (score: number) => void }) {
  const random = useMemo(() => rng(seed), [seed]);
  const [round, setRound] = useState(0);
  const [q, setQ] = useState<ColourQuestion>(() => colourQuestion(0, random));
  const [left, setLeft] = useState(COLOUR_TIME);
  const [score, setScore] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);

  const next = useCallback(
    (gained: number) => {
      const total = score + gained;
      setScore(total);
      setTimeout(() => {
        if (round + 1 >= COLOUR_ROUNDS) return onEnd(total);
        setRound(round + 1);
        setQ(colourQuestion(round + 1, random));
        setLeft(COLOUR_TIME);
        setPicked(null);
      }, 1100);
    },
    [score, round, random, onEnd],
  );

  // The clock ticks down while you're thinking; at zero, the question is gone.
  useEffect(() => {
    if (picked !== null) return;
    const t = setTimeout(() => {
      if (left > 0.1) return setLeft(left - 0.1);
      setLeft(0);
      setPicked(-1);
      buzz.oops();
      onSay(`Time’s up! That was ${formatOhms(q.ohms)}: ${q.bands.map((b) => BAND_NAMES[b]).join(', ')}.`);
      next(0);
    }, 100);
    return () => clearTimeout(t);
  }, [left, picked, q, onSay, next]);

  const answer = (v: number) => {
    if (picked !== null) return;
    setPicked(v);
    const right = v === q.ohms;
    const pts = colourPoints(right, left);
    if (right) buzz.tap();
    else buzz.oops();
    onSay(
      right
        ? pts > 1
          ? 'Quick AND right! Two points.'
          : 'Right! One point.'
        : `Not quite. ${q.bands.map((b) => BAND_NAMES[b]).join(', ')} is ${formatOhms(q.ohms)}.`,
    );
    next(pts);
  };

  return (
    <View style={styles.game}>
      <View style={styles.row}>
        <PixelText size={13} color={CREAM} shadow style={styles.flex}>
          Question {round + 1} of {COLOUR_ROUNDS}
        </PixelText>
        <PixelText size={13} color={GOLD} shadow>
          Score {score}
        </PixelText>
      </View>
      <View style={styles.timer}>
        <View style={[styles.timerFill, { width: `${(left / COLOUR_TIME) * 100}%`, backgroundColor: left < 4 ? RED : GREEN }]} />
      </View>
      {/* The resistor, drawn big. */}
      <View style={styles.resistorRow}>
        <View style={styles.lead} />
        <View style={styles.resistor}>
          {q.bands.map((b, i) => (
            <View key={i} style={[styles.band, { backgroundColor: BAND_HEX[b] }]} />
          ))}
          <View style={styles.flex} />
          <View style={[styles.band, { backgroundColor: '#d2b37d' }]} />
        </View>
        <View style={styles.lead} />
      </View>
      <View style={styles.answers}>
        {q.choices.map((v) => (
          <PixelButton
            key={v}
            label={formatOhms(v)}
            size={16}
            tone={picked === null ? 'cream' : v === q.ohms ? 'gold' : v === picked ? 'orange' : 'cream'}
            disabled={picked !== null && v !== q.ohms && v !== picked}
            onPress={() => answer(v)}
          />
        ))}
      </View>
      <View style={styles.key}>
        {BAND_HEX.map((c, d) => (
          <View key={d} style={styles.keyItem}>
            <View style={[styles.keySwatch, { backgroundColor: c }]} />
            <PixelText size={10} color={CREAM} shadow>
              {d}
            </PixelText>
          </View>
        ))}
      </View>
    </View>
  );
}

// ── Needle Drop ──────────────────────────────────────────────────────────────

const LAMP_NAME: Record<LampColour, string> = { red: 'red', green: 'green', blue: 'blue' };
/** The meter's full scale, in milliamps. */
const DIAL_MA = 30;

function NeedleDrop({ seed, onSay, onEnd }: { seed: number; onSay: (s: string) => void; onEnd: (score: number) => void }) {
  const random = useMemo(() => rng(seed), [seed]);
  const [round, setRound] = useState(0);
  const [q, setQ] = useState<NeedleQuestion>(() => needleQuestion(0, random));
  const [left, setLeft] = useState(NEEDLE_TIME);
  const [score, setScore] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);

  const next = useCallback(
    (gained: number) => {
      const total = score + gained;
      setScore(total);
      setTimeout(() => {
        if (round + 1 >= NEEDLE_ROUNDS) return onEnd(total);
        setRound(round + 1);
        setQ(needleQuestion(round + 1, random));
        setLeft(NEEDLE_TIME);
        setPicked(null);
      }, 1500);
    },
    [score, round, random, onEnd],
  );

  useEffect(() => {
    if (picked !== null) return;
    const t = setTimeout(() => {
      if (left > 0.1) return setLeft(left - 0.1);
      setLeft(0);
      setPicked(-1);
      buzz.oops();
      onSay(`Time’s up! It was ${formatOhms(q.ohms)}.`);
      next(0);
    }, 100);
    return () => clearTimeout(t);
  }, [left, picked, q, onSay, next]);

  const answer = (ohms: number) => {
    if (picked !== null) return;
    setPicked(ohms);
    const right = ohms === q.ohms;
    const pts = right ? (left > NEEDLE_TIME / 2 ? 2 : 1) : 0;
    if (right) buzz.tap();
    else buzz.oops();
    onSay(
      right
        ? pts > 1
          ? 'Bang on, and quick! Grandpa would have whistled.'
          : 'That’s it! The needle’s right on the mark.'
        : `That gives ${q.readings[ohms]} mA. ${ohms > q.ohms ? 'Too much resistor: not enough current.' : 'Not enough resistor: too much current.'}`,
    );
    next(pts);
  };

  // The needle shows the reading for the resistor you picked (or sits at zero while you think).
  const shown = picked !== null && picked > 0 ? q.readings[picked]! : 0;
  const angle = -80 + (Math.min(DIAL_MA, shown) / DIAL_MA) * 160;
  const targetAngle = -80 + (Math.min(DIAL_MA, q.target) / DIAL_MA) * 160;
  return (
    <View style={styles.game}>
      <View style={styles.row}>
        <PixelText size={13} color={CREAM} shadow style={styles.flex}>
          Question {round + 1} of {NEEDLE_ROUNDS}
        </PixelText>
        <PixelText size={13} color={GOLD} shadow>
          Score {score}
        </PixelText>
      </View>
      <View style={styles.timer}>
        <View style={[styles.timerFill, { width: `${(left / NEEDLE_TIME) * 100}%`, backgroundColor: left < 5 ? RED : GREEN }]} />
      </View>
      <PixelText size={14} color={CREAM} shadow style={styles.centerText}>
        {q.volts} V battery, a {LAMP_NAME[q.lamp]} lamp. Which resistor makes the meter read {q.target} mA?
      </PixelText>
      <View style={styles.dialWrap}>
        <View style={styles.dial}>
          {[0, 10, 20, 30].map((mA) => (
            <View key={mA} style={[styles.tick, { transform: [{ rotate: `${-80 + (mA / DIAL_MA) * 160}deg` }] }]}>
              <PixelText size={9} color={INK}>
                {mA}
              </PixelText>
            </View>
          ))}
          <View style={[styles.mark, { transform: [{ rotate: `${targetAngle}deg` }] }]} />
          <View style={[styles.needle, { transform: [{ rotate: `${angle}deg` }] }]} />
          <View style={styles.pivot} />
          <PixelText size={10} color={INK} style={styles.dialUnit}>
            mA
          </PixelText>
        </View>
      </View>
      <View style={styles.answers}>
        {NEEDLE_RESISTORS.map((r) => (
          <PixelButton
            key={r}
            label={formatOhms(r)}
            size={16}
            tone={picked === null ? 'cream' : r === q.ohms ? 'gold' : r === picked ? 'orange' : 'cream'}
            disabled={picked !== null && r !== q.ohms && r !== picked}
            onPress={() => answer(r)}
          />
        ))}
      </View>
    </View>
  );
}

// ── Jar Catch ────────────────────────────────────────────────────────────────

interface JarState {
  t: number;
  x: number;
  steer: number;
  charge: number;
  score: number;
  drops: (Drop & { id: number })[];
  nextAt: number;
  nextId: number;
  pouring: number;
  splash: number;
}

const JAR_W = 0.13;

function JarCatch({ seed, onSay, onEnd }: { seed: number; onSay: (s: string) => void; onEnd: (score: number) => void }) {
  const random = useMemo(() => rng(seed), [seed]);
  const game = useRef<JarState>({ t: 0, x: 0.5, steer: 0, charge: 0, score: 0, drops: [], nextAt: 0.5, nextId: 1, pouring: 0, splash: 0 });
  // What's drawn: a copy of the game taken every frame.
  const [view, setSnap] = useState<JarState>(() => ({ ...game.current }));
  const [size, setSize] = useState({ w: 1, h: 1 });
  const over = useRef(false);

  const pour = useCallback(() => {
    const g = game.current;
    if (g.charge === 0 || g.pouring > 0) return;
    g.score += g.charge;
    g.pouring = 0.6;
    if (g.charge === JAR_SIZE) onSay('A full jar! The lamp’s glowing like a little sun.');
    g.charge = 0;
    buzz.tap();
  }, [onSay]);

  // The game loop: drops fall, the jar catches them.
  useEffect(() => {
    let last = Date.now();
    let frame = 0;
    const tick = () => {
      const now = Date.now();
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const g = game.current;
      g.t += dt;
      g.x = Math.max(JAR_W / 2, Math.min(1 - JAR_W / 2, g.x + g.steer * dt * 0.9));
      g.pouring = Math.max(0, g.pouring - dt);
      g.splash = Math.max(0, g.splash - dt);
      if (g.t >= g.nextAt) {
        g.drops.push({ ...nextDrop(g.t, random), id: g.nextId++ });
        g.nextAt = g.t + dropGap(g.t);
      }
      for (const d of g.drops) d.y += d.speed * dt;
      // Catch whatever reaches the jar's mouth over the jar.
      g.drops = g.drops.filter((d) => {
        if (d.y < 0.84) return true;
        if (d.y > 0.92) return false;
        if (Math.abs(d.x - g.x) > JAR_W / 2 + 0.02) return d.y < 1.05;
        if (d.dark) {
          if (g.charge > 0) onSay('The dark drank your jar! Pour it out sooner next time.');
          g.charge = 0;
          g.splash = 0.5;
          buzz.oops();
        } else if (g.charge < JAR_SIZE) g.charge++;
        else {
          g.splash = 0.3;
          onSay('Overflow! A full jar can’t hold any more. Pour it into the lamp!');
        }
        return false;
      });
      if (g.t >= JAR_SECONDS && !over.current) {
        over.current = true;
        onSay(`Time! You poured ${g.score} sparks into the lamp.`);
        setTimeout(() => onEnd(g.score), 900);
        return;
      }
      setSnap({ ...g, drops: [...g.drops] });
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [random, onEnd, onSay]);

  // Keyboard on the web: arrows / A D to move, space or Enter to pour.
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const held = new Set<string>();
    const sync = () => {
      const l = held.has('ArrowLeft') || held.has('a') || held.has('A');
      const r = held.has('ArrowRight') || held.has('d') || held.has('D');
      game.current.steer = (r ? 1 : 0) - (l ? 1 : 0);
    };
    const down = (e: KeyboardEvent) => {
      if ([' ', 'Enter', 'ArrowUp', 'w', 'W'].includes(e.key)) {
        e.preventDefault();
        pour();
        return;
      }
      held.add(e.key);
      sync();
    };
    const up = (e: KeyboardEvent) => {
      held.delete(e.key);
      sync();
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, [pour]);

  // Touch: drag anywhere in the play area and the jar follows your finger.
  const follow = (e: GestureResponderEvent) => {
    game.current.x = Math.max(JAR_W / 2, Math.min(1 - JAR_W / 2, e.nativeEvent.locationX / size.w));
  };
  return (
    <View style={styles.game}>
      <View style={styles.row}>
        <PixelText size={13} color={CREAM} shadow style={styles.flex}>
          {Math.max(0, Math.ceil(JAR_SECONDS - view.t))} s left
        </PixelText>
        <PixelText size={13} color={GOLD} shadow>
          Poured {view.score}
        </PixelText>
      </View>
      <View
        style={styles.sea}
        onLayout={(e) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderGrant={follow}
        onResponderMove={follow}
      >
        {/* The lamp you pour into, up in the corner. */}
        <View style={[styles.seaLamp, view.pouring > 0 && styles.seaLampLit]} pointerEvents="none" />
        {view.drops.map((d) => (
          <View
            key={d.id}
            pointerEvents="none"
            style={[d.dark ? styles.darkDrop : styles.spark, { left: d.x * size.w - 7, top: d.y * size.h - 7 }]}
          />
        ))}
        <View pointerEvents="none" style={[styles.jar, { left: (view.x - JAR_W / 2) * size.w, width: JAR_W * size.w }, view.splash > 0 && styles.jarSplash]}>
          <View style={[styles.jarFill, { height: `${(view.charge / JAR_SIZE) * 100}%` }]} />
        </View>
      </View>
      <View style={styles.row}>
        <PixelText size={12} color={CREAM} shadow style={styles.flex}>
          Jar: {view.charge}/{JAR_SIZE}
        </PixelText>
        <PixelButton label="Pour into the lamp" tone={view.charge === JAR_SIZE ? 'gold' : 'orange'} size={14} disabled={view.charge === 0} onPress={pour} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, flexDirection: 'row', backgroundColor: NIGHT_DEEP },
  flex: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  side: { width: 250, padding: 12, gap: 8, backgroundColor: NIGHT, borderRightWidth: 2, borderColor: INK },
  main: { flex: 1, padding: 16 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  centerText: { textAlign: 'center', maxWidth: 420 },
  game: { flex: 1, gap: 14, justifyContent: 'center' },
  timer: { height: 10, borderWidth: 2, borderColor: INK, backgroundColor: '#2e2b30' },
  timerFill: { height: '100%' },
  resistorRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  lead: { width: 60, height: 8, backgroundColor: '#b6beb0', borderWidth: 2, borderColor: INK },
  resistor: {
    width: 220,
    height: 76,
    borderRadius: 30,
    backgroundColor: '#eecf9b',
    borderWidth: 3,
    borderColor: '#7b4930',
    flexDirection: 'row',
    paddingHorizontal: 30,
    gap: 16,
  },
  band: { width: 18, height: '100%' },
  answers: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center' },
  key: { flexDirection: 'row', justifyContent: 'center', gap: 6 },
  keyItem: { alignItems: 'center', gap: 2 },
  keySwatch: { width: 20, height: 14, borderWidth: 2, borderColor: INK },
  dialWrap: { alignItems: 'center' },
  dial: {
    width: 220,
    height: 120,
    borderTopLeftRadius: 110,
    borderTopRightRadius: 110,
    backgroundColor: '#fbf4e4',
    borderWidth: 3,
    borderColor: INK,
    alignItems: 'center',
    overflow: 'hidden',
  },
  tick: { position: 'absolute', bottom: 0, height: 108, width: 20, alignItems: 'center', transformOrigin: 'bottom' },
  mark: { position: 'absolute', bottom: 0, height: 100, width: 6, backgroundColor: 'rgba(116,163,52,0.55)', transformOrigin: 'bottom' },
  needle: { position: 'absolute', bottom: 0, height: 96, width: 3, backgroundColor: RED, transformOrigin: 'bottom' },
  pivot: { position: 'absolute', bottom: -8, width: 18, height: 18, borderRadius: 9, backgroundColor: INK },
  dialUnit: { position: 'absolute', bottom: 18 },
  sea: { flex: 1, minHeight: 180, backgroundColor: '#1f3550', borderWidth: 3, borderColor: INK, borderRadius: 6, overflow: 'hidden' },
  seaLamp: { position: 'absolute', right: 10, top: 10, width: 34, height: 34, borderRadius: 17, backgroundColor: '#5b4a2a', borderWidth: 3, borderColor: INK },
  seaLampLit: { backgroundColor: '#ffe166', shadowColor: '#ffe166', shadowRadius: 20, shadowOpacity: 0.9 },
  spark: { position: 'absolute', width: 14, height: 14, borderRadius: 3, backgroundColor: '#ffe166', borderWidth: 2, borderColor: '#f1ae41', transform: [{ rotate: '45deg' }] },
  darkDrop: { position: 'absolute', width: 14, height: 14, borderRadius: 7, backgroundColor: '#3b3643', borderWidth: 2, borderColor: '#9a6ad6' },
  jar: {
    position: 'absolute',
    bottom: 6,
    height: '16%',
    borderWidth: 3,
    borderTopWidth: 0,
    borderColor: '#79b8ce',
    backgroundColor: 'rgba(227,241,245,0.18)',
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  jarSplash: { borderColor: '#e0394c' },
  jarFill: { backgroundColor: '#ffe166' },
});
