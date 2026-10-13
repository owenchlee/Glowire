// A mini-game, opened from somewhere in town: Ms. Ito's Colour Code blackboard or Old Gus's
// Signal Lamp. Left: the host, how to play, your score and best. Right: the game itself.

import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  BAND_NAMES,
  COLOUR_ROUNDS,
  COLOUR_TIME,
  type ColourQuestion,
  GAMES,
  type GameId,
  SEA_ANSWERS_AT,
  SIGNAL_COLOURS,
  type SignalColour,
  colourPoints,
  colourQuestion,
  flashMs,
  formatOhms,
  rng,
  signalPattern,
} from '../game/games';
import { SECRETS, secretKey } from '../game/lore';
import { speakerName } from './Dialog';
import { useGame } from './game';
import { buzz } from './haptics';
import { CREAM, Counter, GOLD, GREEN, INK, NIGHT, NIGHT_DEEP, NameTab, Panel, PixelButton, PixelText, Portrait, RED } from './pixel';

/** Band colours on the board's palette, digit 0 to 9. */
const BAND_HEX = ['#242118', '#7b4930', '#d14b34', '#e67c44', '#ffe166', '#74a334', '#3da6bd', '#a5608b', '#8d977f', '#f2eaf1'];
const LAMP_HEX: Record<SignalColour, string> = { red: '#e0394c', green: '#74a334', blue: '#3da6bd', gold: '#ffe166' };

type Done = { score: number; earned: number; best: number };

export function MiniGame({ id }: { id: GameId }) {
  const info = GAMES[id];
  const { save, finishGame, markSeen } = useGame();
  const [phase, setPhase] = useState<'intro' | 'play' | 'done'>('intro');
  const [done, setDone] = useState<Done | null>(null);
  const [say, setSay] = useState(info.how);
  const [run, setRun] = useState(0);
  const best = save.games[id] ?? 0;

  const finish = useCallback(
    (score: number) => {
      const payout = finishGame(id, score);
      if (payout.earned > 0) buzz.win();
      setDone({ score, earned: payout.earned, best: Math.max(best, score) });
      setPhase('done');
    },
    [finishGame, id, best],
  );

  const start = () => {
    // A new seed every game (this runs on a tap, not while drawing).
    setRun(Date.now() & 0x7fffffff);
    setDone(null);
    setPhase('play');
  };

  return (
    <SafeAreaView style={styles.screen} edges={['left', 'right']}>
      <View style={styles.side}>
        <View style={styles.row}>
          <PixelButton label="‹" tone="cream" size={16} onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
          <PixelText size={18} color={GOLD} shadow style={styles.flex}>
            {info.title}
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
              Beat your best score to earn sparks: ⚡3 for every point.
            </PixelText>
            <PixelButton label="Start!" tone="orange" size={18} onPress={start} />
          </View>
        )}
        {phase === 'play' && id === 'colours' && <ColourCode key={run} seed={run} onSay={setSay} onEnd={finish} />}
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
            <View style={styles.row}>
              <PixelButton label="Play again" tone="orange" size={15} onPress={start} />
              <PixelButton label="Back to town" tone="cream" size={15} onPress={() => router.back()} />
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

// ── Signal Lamp ──────────────────────────────────────────────────────────────

function SignalLamp({
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
            style={[styles.lampButton, { backgroundColor: LAMP_HEX[c], opacity: showing || over ? 0.45 : lit === c ? 1 : 0.8 }]}
          />
        ))}
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
  lampWrap: { alignItems: 'center', paddingVertical: 8 },
  bigLamp: { width: 110, height: 110, borderRadius: 55, borderWidth: 4, borderColor: INK, shadowRadius: 30, shadowOpacity: 0.9 },
  lampButton: { width: 84, height: 64, borderRadius: 10, borderWidth: 3, borderColor: INK },
});
