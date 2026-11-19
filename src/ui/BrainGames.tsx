// The four brain games, one per world (game/puzzles.ts has the rules). MiniGame.tsx hosts
// them: it shows the character and the instructions, these draw the playing field.
//
//   Dead Lamp Hunt (Glowtown)   Dockyard Wiring (Harbour)
//   Clock Panel (Mossbell)      Lantern Budget (Deep)

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { rng } from '../game/games';
import {
  E,
  LANTERN_RIGHT,
  LANTERN_START,
  LANTERN_WRONG,
  N,
  type LanternRound,
  type PanelBoard,
  type Pipe,
  type PipeBoard,
  type ProbeRound,
  type Rig,
  S,
  W,
  lampMilliamps,
  lanternDrain,
  lanternRound,
  panelBoard,
  panelPoints,
  panelSolution,
  panelSolved,
  pipeHint,
  probeHint,
  rigInTheWay,
  rigPush,
  pipeBoard,
  pipePoints,
  pipesSolved,
  powered,
  pressPanel,
  probePoints,
  probeReading,
  probeRound,
  turnPipe,
} from '../game/puzzles';
import { GameStage, stageAssets } from '../render/GameStage';
import { getAssets } from '../render/assets';
import { BASE_HEIGHT, TOP } from '../render/layout';
import { Arm } from '../render/TileModel';
import type { Direction } from '../engine';
import { buzz } from './haptics';
import { type BrainProps, type HintRef, useHint } from './hint';
import { CREAM, GOLD, GREEN, INK, PixelButton, PixelText, RED } from './pixel';

const place = (i: number, w: number) => `row ${Math.floor(i / w) + 1}, column ${(i % w) + 1}`;

const DARK = '#2e2b30';
const LIT = '#ffe166';
const WIRE_OFF = '#8d977f';

// ── Dead Lamp Hunt ───────────────────────────────────────────────────────────

const PROBE_ROUNDS = 6;
const FUSES = 3;

export function DeadLampHunt({ seed, onSay, onEnd, hint }: BrainProps) {
  const random = useMemo(() => rng(seed), [seed]);
  const [round, setRound] = useState(0);
  const [r, setR] = useState<ProbeRound>(() => probeRound(0, random));
  const [score, setScore] = useState(0);
  const [fuses, setFuses] = useState(FUSES);
  const [a, setA] = useState<number | null>(null);
  const [b, setB] = useState<number | null>(null);
  const [used, setUsed] = useState(0);
  const [cleared, setCleared] = useState<boolean[]>(() => new Array(r.lamps).fill(false));
  const [suspect, setSuspect] = useState<[number, number] | null>(null);
  const [log, setLog] = useState<string[]>([]);
  const [revealed, setRevealed] = useState(false);
  useHint(hint, () => {
    if (revealed) return null;
    const h = probeHint(r.lamps, cleared, suspect);
    if (h.only || used >= r.probes) return `It has to be lamp ${h.from + 1}. Tap it, then "It's this one!"`;
    if (h.from === h.to) return `Tap lamp ${h.from + 1} on its own and probe it.`;
    return `Probe lamps ${h.from + 1} to ${h.to + 1}: tap ${h.from + 1}, then ${h.to + 1}, then Probe. That's half of what's left.`;
  });

  const lo = a === null ? -1 : Math.min(a, b ?? a);
  const hi = a === null ? -1 : Math.max(a, b ?? a);
  const single = a !== null && lo === hi;

  const pick = (i: number) => {
    if (revealed) return;
    if (a === null || b !== null) {
      setA(i);
      setB(null);
    } else setB(i);
  };

  const advance = (gained: number, lost: boolean) => {
    const total = score + gained;
    const left = lost ? fuses - 1 : fuses;
    setScore(total);
    setFuses(left);
    setRevealed(true);
    setTimeout(() => {
      if (left <= 0 || round + 1 >= PROBE_ROUNDS) return onEnd(total);
      const next = probeRound(round + 1, random);
      setRound(round + 1);
      setR(next);
      setCleared(new Array(next.lamps).fill(false));
      setSuspect(null);
      setLog([]);
      setUsed(0);
      setA(null);
      setB(null);
      setRevealed(false);
    }, 1600);
  };

  const probe = () => {
    if (a === null || used >= r.probes || revealed) return;
    const reading = probeReading(r, lo, hi);
    setUsed(used + 1);
    const span = lo === hi ? `lamp ${lo + 1}` : `lamps ${lo + 1}–${hi + 1}`;
    setLog([...log, `${span}: ${reading} V`]);
    if (reading === 0) {
      setCleared(cleared.map((c, i) => c || (i >= lo && i <= hi)));
      onSay(`${reading} V across ${span}. No gap in there, so those lamps are fine.`);
    } else {
      setSuspect([lo, hi]);
      onSay(`${reading} V! The whole battery is pushing across a gap. The dead lamp is somewhere in ${span}.`);
    }
    buzz.tap();
    setA(null);
    setB(null);
  };

  const name = () => {
    if (!single || revealed) return;
    if (lo === r.dead) {
      buzz.win();
      onSay(`That's the one! Lamp ${lo + 1}. ${used <= Math.ceil(Math.log2(r.lamps)) ? 'You halved it every time. Lovely.' : 'Got there.'}`);
      advance(probePoints(r, used), false);
    } else {
      buzz.oops();
      onSay(`Lamp ${lo + 1} is fine. It was lamp ${r.dead + 1}. That blows a fuse.`);
      advance(0, true);
    }
  };

  return (
    <View style={styles.game}>
      <View style={styles.row}>
        <PixelText size={17} color={CREAM} shadow style={styles.flex}>
          Street {round + 1} of {PROBE_ROUNDS} · {r.volts} V battery
        </PixelText>
        <PixelText size={17} color={RED} shadow>
          {'▮'.repeat(fuses)}
        </PixelText>
        <PixelText size={17} color={GOLD} shadow>
          Score {score}
        </PixelText>
      </View>
      <GameStage
        cols={r.lamps}
        rows={1}
        margin={0.4}
        onPress={pick}
        accessibilityLabel={`String of ${r.lamps} street lamps. Tap one, then another, to pick a stretch`}
        highlight={(i) => a !== null && i >= lo && i <= hi}
        cell={(i) => {
          const maybe = !!suspect && i >= suspect[0] && i <= suspect[1] && !cleared[i];
          const state = revealed ? (i === r.dead ? 'dead' : 'on') : cleared[i] ? 'clear' : maybe ? 'maybe' : 'off';
          return <Lamp3D state={state} />;
        }}
      />
      {/* Numbers under the lamps: the board spans the width, less half a cell's margin each side. */}
      <View style={[styles.lampNumbers, { paddingHorizontal: `${(100 * 0.85) / (r.lamps + 1.7)}%` }]}>
        {Array.from({ length: r.lamps }, (_, i) => (
          <PixelText key={i} size={16} color={CREAM} shadow style={styles.lampNumber}>
            {i + 1}
          </PixelText>
        ))}
      </View>
      <PixelText size={12} color="#c9c3e6" style={styles.centerText}>
        {revealed
          ? ' '
          : a === null
            ? 'Tap a lamp, then another, to pick a stretch.'
            : `Probing ${lo === hi ? `lamp ${lo + 1}` : `lamps ${lo + 1} to ${hi + 1}`}`}
      </PixelText>
      <View style={styles.rowCenter}>
        <PixelButton
          label={`Probe  (${Math.max(0, r.probes - used)} left)`}
          tone="gold"
          size={15}
          disabled={a === null || used >= r.probes || revealed}
          onPress={probe}
        />
        <PixelButton label="It's this one!" tone="orange" size={15} disabled={!single || revealed} onPress={name} />
      </View>
      <View style={styles.logRow}>
        {log.map((l, i) => (
          <PixelText key={i} size={11} color={l.endsWith(' 0 V') ? '#9cd0a3' : GOLD}>
            {l}
          </PixelText>
        ))}
      </View>
    </View>
  );
}

// ── Dockyard Wiring ──────────────────────────────────────────────────────────

const PIPE_ROUNDS = 5;
const CELL = 46;
const ARM = 10;

export function DockyardWiring({ seed, onSay, onEnd, hint }: BrainProps) {
  const random = useMemo(() => rng(seed), [seed]);
  const [round, setRound] = useState(0);
  const [board, setBoard] = useState<PipeBoard>(() => pipeBoard(0, random));
  const [taps, setTaps] = useState(0);
  const [score, setScore] = useState(0);
  const [won, setWon] = useState(false);
  const on = useMemo(() => powered(board), [board]);
  useHint(hint, () => {
    const h = won ? null : pipeHint(board);
    return h ? `Turn the tile at ${place(h.i, board.w)} ${h.turns === 1 ? 'once' : `${h.turns} times`}. Bzzt!` : null;
  });

  const tap = (i: number) => {
    if (won) return;
    const next = turnPipe(board, i);
    if (next === board) {
      onSay('That diode is bolted down. Rules are rules: turn the wires around it instead.');
      buzz.oops();
      return;
    }
    const t = taps + 1;
    setTaps(t);
    setBoard(next);
    buzz.tap();
    if (pipesSolved(next)) {
      const gained = pipePoints(t, next.par);
      const total = score + gained;
      setScore(total);
      setWon(true);
      buzz.win();
      onSay(
        t <= next.par
          ? `All lamps lit in ${t} turns. Par is ${next.par}. Excellent wiring.`
          : `All lamps lit, ${t} turns (par ${next.par}). Power flows. Good.`,
      );
      setTimeout(() => {
        if (round + 1 >= PIPE_ROUNDS) return onEnd(total);
        setBoard(pipeBoard(round + 1, random));
        setRound(round + 1);
        setTaps(0);
        setWon(false);
      }, 1500);
    }
  };

  return (
    <View style={styles.game}>
      <View style={styles.row}>
        <PixelText size={17} color={CREAM} shadow style={styles.flex}>
          Board {round + 1} of {PIPE_ROUNDS} · Turns {taps} · Par {board.par}
        </PixelText>
        <PixelText size={17} color={GOLD} shadow>
          Score {score}
        </PixelText>
      </View>
      <GameStage
        cols={board.w}
        rows={board.h}
        onPress={tap}
        accessibilityLabel={`Wiring board, ${board.w} by ${board.h}. Tap a tile to turn it`}
        cell={(i) => <Pipe3D t={board.tiles[i]!} lit={on[i]!} />}
      />
    </View>
  );
}

// ── Clock Panel ──────────────────────────────────────────────────────────────

const PANEL_ROUNDS = 3;

export function ClockPanel({ seed, onSay, onEnd, hint }: BrainProps) {
  const random = useMemo(() => rng(seed), [seed]);
  const [round, setRound] = useState(0);
  const [panel, setPanel] = useState<PanelBoard>(() => panelBoard(0, random));
  const [presses, setPresses] = useState(0);
  const [score, setScore] = useState(0);
  const [won, setWon] = useState(false);
  const [start, setStart] = useState(panel.on);
  useHint(hint, () => {
    const fix = won ? [] : panelSolution(panel.n, panel.on);
    if (!fix.length) return null;
    return `Press the clock at ${place(fix[0]!, panel.n)}. ${fix.length === 1 ? "That's the last one!" : `You're ${fix.length} presses from done.`}`;
  });

  const press = (i: number) => {
    if (won) return;
    const next = { ...panel, on: pressPanel(panel.n, panel.on, i) };
    const count = presses + 1;
    setPanel(next);
    setPresses(count);
    buzz.tap();
    if (panelSolved(next)) {
      const total = score + panelPoints(count, panel.par);
      setScore(total);
      setWon(true);
      buzz.win();
      onSay(
        count <= panel.par
          ? `Tick, tick, tick! Every clock running, in ${count} presses. That's par or better.`
          : `Every clock is ticking again (${count} presses, par ${panel.par}). Time moves on.`,
      );
      setTimeout(() => {
        if (round + 1 >= PANEL_ROUNDS) return onEnd(total);
        const fresh = panelBoard(round + 1, random);
        setPanel(fresh);
        setStart(fresh.on);
        setRound(round + 1);
        setPresses(0);
        setWon(false);
      }, 1500);
    }
  };

  return (
    <View style={styles.game}>
      <View style={styles.row}>
        <PixelText size={18} color={CREAM} shadow style={styles.flex}>
          Panel {round + 1} of {PANEL_ROUNDS} · Presses {presses} · Par {panel.par}
        </PixelText>
        <PixelText size={18} color={GOLD} shadow>
          Score {score}
        </PixelText>
        <PixelButton
          label="Reset"
          tone="cream"
          size={14}
          onPress={() => {
            if (won) return;
            setPanel({ ...panel, on: start });
            setPresses(0);
          }}
        />
      </View>
      <GameStage
        cols={panel.n}
        rows={panel.n}
        onPress={press}
        accessibilityLabel={`Clock panel, ${panel.on.filter((o) => !o).length} clocks stopped. Tap a clock to flip it and its neighbours`}
        cell={(i) => <Clock3D on={panel.on[i]!} />}
      />
    </View>
  );
}

// ── Lantern Budget ───────────────────────────────────────────────────────────

const LANTERN_MAX_ROUNDS = 30;
/** Rounds at the start with no clock, while the player learns. */
const LEARNING_ROUNDS = 3;

type Size = { width: number; height: number };

/** Drawn at a small natural size, then scaled up by the parent (see LanternBudget) to fill the card. */
function RigPicture({ rig, scale, onSize }: { rig: Rig; scale: number; onSize: (s: Size) => void }) {
  const lamp = <View key="l" style={styles.chipLamp} />;
  const res = (
    <View key="r" style={styles.chipRes}>
      {/* Size tracks strength, so rigs compare by eye with no physics needed. */}
      <PixelText size={9 + rig.ohms / 60} color={INK}>
        {rig.ohms}Ω
      </PixelText>
    </View>
  );
  const wire = (k: string) => <View key={k} style={styles.chipWire} />;
  return (
    <View style={[styles.rigPic, { transform: [{ scale }] }]} onLayout={(e) => onSize(e.nativeEvent.layout)}>
      <View style={styles.chipBat}>
        <PixelText size={9 + rig.volts} color={INK}>
          {rig.volts}V
        </PixelText>
      </View>
      {wire('w0')}
      {rig.kind === 'series' && [res, wire('w1'), lamp]}
      {rig.kind === 'twin' && [lamp, wire('w1'), <View key="l2" style={styles.chipLamp} />]}
      {rig.kind === 'diode' && [
        <View key="d" style={styles.chipDiode}>
          <PixelText size={11} color={INK}>
            diode
          </PixelText>
        </View>,
        wire('w1'),
        lamp,
      ]}
      {rig.kind === 'parallel' && (
        <View key="p" style={styles.chipStack}>
          {lamp}
          {res}
        </View>
      )}
    </View>
  );
}

export function LanternBudget({ seed, onSay, onEnd, hint }: BrainProps) {
  const random = useMemo(() => rng(seed), [seed]);
  const [round, setRound] = useState(0);
  const [q, setQ] = useState<LanternRound>(() => lanternRound(0, random));
  const [charge, setCharge] = useState(LANTERN_START);
  const [score, setScore] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  useHint(hint, () =>
    picked !== null
      ? null
      : `Volts ÷ ohms in the lamp's path: ${q.rigs.map((rig, k) => `card ${k + 1} is ${rigPush(rig)} V over ${rigInTheWay(rig)} Ω`).join(', ')}. Biggest answer wins.`,
  );
  const [card, setCard] = useState<Size | null>(null);
  const [pics, setPics] = useState<(Size | undefined)[]>([]);
  // One scale for all three, so a bigger battery still looks bigger than its neighbours'.
  const scale =
    card && pics.length === 3 && pics.every(Boolean)
      ? Math.max(0.5, Math.min(4, ...pics.map((p) => Math.min((card.width * 0.85) / p!.width, (card.height * 0.5) / p!.height))))
      : 1;

  const end = useCallback(
    (finalScore: number) => {
      onSay(`The lantern goes out. You got ${finalScore} right. In the dark, something breathes in.`);
      onEnd(finalScore);
    },
    [onEnd, onSay],
  );

  // The lantern burns down while you think (not in the first few rounds: those are for learning).
  useEffect(() => {
    if (picked !== null || round < LEARNING_ROUNDS) return;
    const t = setTimeout(() => {
      const left = charge - lanternDrain(round) * 0.1;
      if (left <= 0) return end(score);
      setCharge(left);
    }, 100);
    return () => clearTimeout(t);
  }, [charge, picked, round, score, end]);

  const choose = (i: number) => {
    if (picked !== null) return;
    setPicked(i);
    const right = i === q.best;
    const ma = q.rigs.map(lampMilliamps);
    const total = right ? score + 1 : score;
    const next = right ? Math.min(LANTERN_START, charge + LANTERN_RIGHT) : charge - LANTERN_WRONG;
    setScore(total);
    setCharge(next);
    if (right) buzz.tap();
    else buzz.oops();
    onSay(
      right
        ? `Yes: ${Math.round(ma[q.best]!)} mA, the most of the three. The lantern flares.`
        : `The brightest was ${Math.round(ma[q.best]!)} mA, yours only ${Math.round(ma[i]!)} mA. The Hush takes a bite.`,
    );
    setTimeout(() => {
      if (next <= 0 || round + 1 >= LANTERN_MAX_ROUNDS) return end(total);
      setRound(round + 1);
      setQ(lanternRound(round + 1, random));
      setPicked(null);
    }, 1800);
  };

  const low = charge < 30;
  return (
    <View style={styles.game}>
      <View style={styles.row}>
        <PixelText size={17} color={CREAM} shadow style={styles.flex}>
          Which lights the lamp brightest?
        </PixelText>
        <PixelText size={17} color={GOLD} shadow>
          Score {score}
        </PixelText>
      </View>
      <View style={styles.timer}>
        <View style={[styles.timerFill, { width: `${Math.max(0, charge)}%`, backgroundColor: low ? RED : LIT }]} />
      </View>
      <PixelText size={16} color="#ffe9a8" shadow style={styles.centerText}>
        Bigger battery = brighter. Anything else in the line dims it.
      </PixelText>
      <View style={[styles.rigRow, styles.flex]}>
        {q.rigs.map((rig, i) => {
          const shown = picked !== null;
          return (
            <Pressable key={i} onPress={() => choose(i)} accessibilityRole="button" accessibilityLabel={`Pick rig ${i + 1}`} style={styles.flex}>
              <View
                style={[styles.rigCard, shown && i === q.best && styles.rigBest, shown && i === picked && i !== q.best && styles.rigWrong]}
                onLayout={i === 0 ? (e) => setCard(e.nativeEvent.layout) : undefined}
              >
                <RigPicture
                  rig={rig}
                  scale={scale}
                  onSize={({ width, height }) => setPics((p) => Object.assign([...p], { [i]: { width, height } }))}
                />
                <PixelText size={22} color={GOLD} style={styles.rigAnswer}>
                  {shown ? `${Math.round(lampMilliamps(rig))} mA` : ' '}
                </PixelText>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

// ── 3D pieces ────────────────────────────────────────────────────────────────

/** Puzzle sides (bit flags) to the board's directions. */
const SIDE_DIR: Record<number, Direction> = { [N]: 0, [E]: 1, [S]: 2, [W]: 3 };
/** Turn a piece lying along +x to face a side. */
const SIDE_ANGLE: Record<number, number> = { [E]: 0, [S]: -Math.PI / 2, [W]: Math.PI, [N]: Math.PI / 2 };

function Pipe3D({ t, lit }: { t: Pipe; lit: boolean }) {
  const { geometry: g, material: m } = getAssets();
  const wire = m.wireLevels[lit ? 4 : 0]!;
  const base = t.kind === 'battery' ? m.base.battery : t.kind === 'lamp' ? m.base.led : t.kind === 'diode' ? m.base.diode : m.base.wire;
  return (
    <>
      <mesh geometry={g.base} material={base} position-y={BASE_HEIGHT / 2} />
      {[N, E, S, W].filter((side) => t.mask & side).map((side) => (
        <Arm key={side} dir={SIDE_DIR[side]!} material={wire} />
      ))}
      <mesh geometry={g.joint} material={wire} position-y={TOP + 0.04} />
      {t.kind === 'battery' && <mesh geometry={g.batteryBody} material={m.batteryBody} position-y={TOP + 0.17} scale={0.75} />}
      {t.kind === 'lamp' && (
        <mesh geometry={g.ledDome} material={lit ? stageAssets().material.lampOn : stageAssets().material.lampOff} position-y={TOP + 0.07} scale={1.25} />
      )}
      {t.kind === 'diode' && (
        <group rotation-y={SIDE_ANGLE[t.flow ?? E]}>
          <mesh geometry={g.resistorBody} material={m.diodeBody} position-y={TOP + 0.12} />
          <mesh geometry={g.resistorBand} material={m.diodeBand} position={[0.12, TOP + 0.12, 0]} scale={[1.6, 1, 1]} />
        </group>
      )}
    </>
  );
}

/** A clock face stopped at 11:52, glowing while it ticks. */
function Clock3D({ on }: { on: boolean }) {
  const { geometry: g, material: m } = stageAssets();
  const hand = on ? m.handOn : m.handOff;
  // Clockwise from 12 (−z), seen from above, is a negative turn about y.
  const turn = (deg: number) => (-deg * Math.PI) / 180;
  return (
    <>
      <mesh geometry={g.clockRim} material={m.rim} position-y={0.04} />
      <mesh geometry={g.clockFace} material={on ? m.clockOn : m.clockOff} position-y={0.1} />
      <mesh geometry={g.hand} material={hand} position-y={0.175} rotation-y={turn(312)} scale={[1, 1, 0.3]} />
      <mesh geometry={g.hand} material={hand} position-y={0.18} rotation-y={turn(356)} scale={[1.3, 1, 0.19]} />
    </>
  );
}

type LampState = 'off' | 'on' | 'dead' | 'clear' | 'maybe';

/** A little street lamp on a post. */
function Lamp3D({ state }: { state: LampState }) {
  const { geometry: g, material: m } = stageAssets();
  const head = { off: m.lampOff, on: m.lampOn, dead: m.lampDead, clear: m.lampClear, maybe: m.lampMaybe }[state];
  return (
    <>
      <mesh geometry={g.lampPost} material={m.post} position-y={0.35} />
      <mesh geometry={g.lampHead} material={head} position-y={0.74} />
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  game: { flex: 1, gap: 12, justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rowCenter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  centerText: { textAlign: 'center' },
  timer: { height: 10, borderWidth: 2, borderColor: INK, backgroundColor: DARK },
  timerFill: { height: '100%' },

  lampNumbers: { flexDirection: 'row' },
  lampNumber: { flex: 1, textAlign: 'center' },
  streetLamp: { width: 34, height: 34, borderRadius: 17, borderWidth: 3, borderColor: INK, backgroundColor: DARK, alignItems: 'center', justifyContent: 'center' },
  streetLampLit: { backgroundColor: LIT },
  streetLampClear: { backgroundColor: '#3b5a3f', borderColor: '#9cd0a3' },
  streetLampMaybe: { borderColor: GOLD },
  streetLampPicked: { borderColor: CREAM, backgroundColor: '#5a4a8a' },
  streetLampDead: { backgroundColor: RED },
  logRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'center', minHeight: 20 },

  pipeGrid: { backgroundColor: '#1a2a2c', borderWidth: 3, borderColor: INK },
  pipeCell: { position: 'absolute', width: CELL, height: CELL },
  pipeBack: { flex: 1, margin: 1, backgroundColor: '#243a3c', alignItems: 'center', justifyContent: 'center' },
  pipeBolted: { backgroundColor: '#3a3a52' },
  arm: { position: 'absolute' },
  armN: { top: 0, left: CELL / 2 - ARM / 2 - 1, width: ARM, height: CELL / 2 },
  armS: { bottom: 0, left: CELL / 2 - ARM / 2 - 1, width: ARM, height: CELL / 2 },
  armE: { right: 0, top: CELL / 2 - ARM / 2 - 1, height: ARM, width: CELL / 2 },
  armW: { left: 0, top: CELL / 2 - ARM / 2 - 1, height: ARM, width: CELL / 2 },
  hub: { width: ARM, height: ARM },
  battery: { position: 'absolute', width: 24, height: 24, backgroundColor: '#e8955a', borderWidth: 3, borderColor: INK, alignItems: 'center', justifyContent: 'center' },
  pipeLamp: { position: 'absolute', width: 24, height: 24, borderRadius: 12, backgroundColor: DARK, borderWidth: 3, borderColor: INK },
  pipeLampLit: { backgroundColor: LIT, shadowColor: LIT, shadowRadius: 12, shadowOpacity: 0.9 },
  arrow: { position: 'absolute', width: 0, height: 0, borderTopWidth: 9, borderBottomWidth: 9, borderLeftWidth: 14, borderTopColor: 'transparent', borderBottomColor: 'transparent', borderLeftColor: '#d9cdd6' },

  clockGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center' },
  clock: { borderWidth: 3, borderColor: INK, alignItems: 'center', justifyContent: 'center' },
  clockOn: { backgroundColor: LIT, shadowColor: LIT, shadowRadius: 18, shadowOpacity: 0.9 },
  clockOff: { backgroundColor: '#3d3a46' },
  hand: { position: 'absolute', width: 3, bottom: '50%', transformOrigin: 'bottom' },
  clockPin: { width: 6, height: 6, borderRadius: 3 },

  rigRow: { flexDirection: 'row', gap: 10 },
  rigCard: { flex: 1, borderWidth: 3, borderColor: INK, backgroundColor: '#1f3550', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  rigAnswer: { position: 'absolute', bottom: 10, left: 0, right: 0, textAlign: 'center' },
  rigBest: { borderColor: GREEN },
  rigWrong: { borderColor: RED },
  rigPic: { flexDirection: 'row', alignItems: 'center' },
  chipBat: { backgroundColor: GOLD, borderWidth: 2, borderColor: INK, paddingHorizontal: 4, paddingVertical: 3 },
  chipWire: { width: 8, height: 3, backgroundColor: WIRE_OFF },
  chipRes: { backgroundColor: '#eecf9b', borderWidth: 2, borderColor: '#7b4930', paddingHorizontal: 3, paddingVertical: 2 },
  chipLamp: { width: 20, height: 20, borderRadius: 10, backgroundColor: LIT, borderWidth: 2, borderColor: INK },
  chipDiode: { backgroundColor: '#a5608b', borderWidth: 2, borderColor: INK, paddingHorizontal: 3, paddingVertical: 2 },
  chipStack: { gap: 4, alignItems: 'center' },
});
