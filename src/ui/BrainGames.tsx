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
  panelSolved,
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
import { buzz } from './haptics';
import { CREAM, GOLD, GREEN, INK, PixelButton, PixelText, RED } from './pixel';

export interface BrainProps {
  seed: number;
  onSay: (s: string) => void;
  onEnd: (score: number) => void;
}

const DARK = '#2e2b30';
const LIT = '#ffe166';
const WIRE_OFF = '#8d977f';

// ── Dead Lamp Hunt ───────────────────────────────────────────────────────────

const PROBE_ROUNDS = 6;
const FUSES = 3;

export function DeadLampHunt({ seed, onSay, onEnd }: BrainProps) {
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
        <PixelText size={13} color={CREAM} shadow style={styles.flex}>
          Street {round + 1} of {PROBE_ROUNDS} · {r.volts} V battery
        </PixelText>
        <PixelText size={13} color={RED} shadow>
          {'▮'.repeat(fuses)}
        </PixelText>
        <PixelText size={13} color={GOLD} shadow>
          Score {score}
        </PixelText>
      </View>
      <View style={styles.lampRow}>
        {Array.from({ length: r.lamps }, (_, i) => {
          const inSpan = a !== null && i >= lo && i <= hi;
          const maybe = suspect && i >= suspect[0] && i <= suspect[1] && !cleared[i];
          const isDead = revealed && i === r.dead;
          return (
            <Pressable key={i} onPress={() => pick(i)} hitSlop={4}>
              <View
                style={[
                  styles.streetLamp,
                  revealed && !isDead && styles.streetLampLit,
                  cleared[i] && !revealed && styles.streetLampClear,
                  maybe && !revealed && styles.streetLampMaybe,
                  inSpan && styles.streetLampPicked,
                  isDead && styles.streetLampDead,
                ]}
              >
                <PixelText size={10} color={revealed && !isDead ? INK : CREAM}>
                  {isDead ? '✕' : i + 1}
                </PixelText>
              </View>
            </Pressable>
          );
        })}
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

export function DockyardWiring({ seed, onSay, onEnd }: BrainProps) {
  const random = useMemo(() => rng(seed), [seed]);
  const [round, setRound] = useState(0);
  const [board, setBoard] = useState<PipeBoard>(() => pipeBoard(0, random));
  const [taps, setTaps] = useState(0);
  const [score, setScore] = useState(0);
  const [won, setWon] = useState(false);
  const on = useMemo(() => powered(board), [board]);

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
        <PixelText size={13} color={CREAM} shadow style={styles.flex}>
          Board {round + 1} of {PIPE_ROUNDS} · Turns {taps} · Par {board.par}
        </PixelText>
        <PixelText size={13} color={GOLD} shadow>
          Score {score}
        </PixelText>
      </View>
      <View style={styles.center}>
        <View style={[styles.pipeGrid, { width: board.w * CELL, height: board.h * CELL }]}>
          {board.tiles.map((t, i) => {
            const lit = on[i]!;
            const wire = lit ? LIT : WIRE_OFF;
            return (
              <Pressable key={i} onPress={() => tap(i)} style={[styles.pipeCell, { left: (i % board.w) * CELL, top: Math.floor(i / board.w) * CELL }]}>
                <View style={[styles.pipeBack, t.kind === 'diode' && styles.pipeBolted]}>
                  {t.mask & N ? <View style={[styles.arm, styles.armN, { backgroundColor: wire }]} /> : null}
                  {t.mask & S ? <View style={[styles.arm, styles.armS, { backgroundColor: wire }]} /> : null}
                  {t.mask & E ? <View style={[styles.arm, styles.armE, { backgroundColor: wire }]} /> : null}
                  {t.mask & W ? <View style={[styles.arm, styles.armW, { backgroundColor: wire }]} /> : null}
                  <View style={[styles.hub, { backgroundColor: wire }]} />
                  {t.kind === 'battery' && (
                    <View style={styles.battery}>
                      <PixelText size={11} color={INK}>
                        +
                      </PixelText>
                    </View>
                  )}
                  {t.kind === 'lamp' && <View style={[styles.pipeLamp, lit && styles.pipeLampLit]} />}
                  {t.kind === 'diode' && (
                    <View
                      style={[
                        styles.arrow,
                        { transform: [{ rotate: `${t.flow === N ? -90 : t.flow === S ? 90 : t.flow === W ? 180 : 0}deg` }] },
                      ]}
                    />
                  )}
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

// ── Clock Panel ──────────────────────────────────────────────────────────────

const PANEL_ROUNDS = 5;

export function ClockPanel({ seed, onSay, onEnd }: BrainProps) {
  const random = useMemo(() => rng(seed), [seed]);
  const [round, setRound] = useState(0);
  const [panel, setPanel] = useState<PanelBoard>(() => panelBoard(0, random));
  const [presses, setPresses] = useState(0);
  const [score, setScore] = useState(0);
  const [won, setWon] = useState(false);
  const size = panel.n <= 3 ? 64 : panel.n === 4 ? 58 : 50;

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
        setPanel(panelBoard(round + 1, random));
        setRound(round + 1);
        setPresses(0);
        setWon(false);
      }, 1500);
    }
  };

  return (
    <View style={styles.game}>
      <View style={styles.row}>
        <PixelText size={13} color={CREAM} shadow style={styles.flex}>
          Panel {round + 1} of {PANEL_ROUNDS} · Presses {presses} · Par {panel.par}
        </PixelText>
        <PixelText size={13} color={GOLD} shadow>
          Score {score}
        </PixelText>
      </View>
      <View style={styles.center}>
        <View style={[styles.clockGrid, { width: panel.n * (size + 6) }]}>
          {panel.on.map((on, i) => (
            <Pressable key={i} onPress={() => press(i)}>
              <View style={[styles.clock, { width: size, height: size, borderRadius: size / 2 }, on ? styles.clockOn : styles.clockOff]}>
                {/* Stopped at 11:52: the minute hand points at 52, the hour hand just shy of 12. */}
                <View style={[styles.hand, { height: size * 0.18, transform: [{ rotate: '356deg' }], backgroundColor: on ? INK : '#6e6b73' }]} />
                <View style={[styles.hand, { height: size * 0.3, transform: [{ rotate: '312deg' }], backgroundColor: on ? INK : '#6e6b73' }]} />
                <View style={[styles.clockPin, { backgroundColor: on ? INK : '#6e6b73' }]} />
              </View>
            </Pressable>
          ))}
        </View>
      </View>
    </View>
  );
}

// ── Lantern Budget ───────────────────────────────────────────────────────────

const LANTERN_MAX_ROUNDS = 30;

function RigPicture({ rig }: { rig: Rig }) {
  const lamp = <View key="l" style={styles.chipLamp} />;
  const res = (
    <View key="r" style={styles.chipRes}>
      <PixelText size={10} color={INK}>
        {rig.ohms}Ω
      </PixelText>
    </View>
  );
  const wire = (k: string) => <View key={k} style={styles.chipWire} />;
  return (
    <View style={styles.rigPic}>
      <View style={styles.chipBat}>
        <PixelText size={11} color={INK}>
          {rig.volts}V
        </PixelText>
      </View>
      {wire('w0')}
      {rig.kind === 'series' && [res, wire('w1'), lamp]}
      {rig.kind === 'twin' && [lamp, wire('w1'), <View key="l2" style={styles.chipLamp} />]}
      {rig.kind === 'diode' && [
        <View key="d" style={styles.chipDiode}>
          <PixelText size={10} color={INK}>
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

export function LanternBudget({ seed, onSay, onEnd }: BrainProps) {
  const random = useMemo(() => rng(seed), [seed]);
  const [round, setRound] = useState(0);
  const [q, setQ] = useState<LanternRound>(() => lanternRound(0, random));
  const [charge, setCharge] = useState(LANTERN_START);
  const [score, setScore] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);

  const end = useCallback(
    (finalScore: number) => {
      onSay(`The lantern goes out. You got ${finalScore} right. In the dark, something breathes in.`);
      onEnd(finalScore);
    },
    [onEnd, onSay],
  );

  // The lantern burns down while you think.
  useEffect(() => {
    if (picked !== null) return;
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
        <PixelText size={13} color={CREAM} shadow style={styles.flex}>
          Which lights the lamp brightest?
        </PixelText>
        <PixelText size={13} color={GOLD} shadow>
          Score {score}
        </PixelText>
      </View>
      <View style={styles.timer}>
        <View style={[styles.timerFill, { width: `${Math.max(0, charge)}%`, backgroundColor: low ? RED : LIT }]} />
      </View>
      <View style={styles.rigRow}>
        {q.rigs.map((rig, i) => {
          const shown = picked !== null;
          return (
            <Pressable key={i} onPress={() => choose(i)} style={styles.flex}>
              <View style={[styles.rigCard, shown && i === q.best && styles.rigBest, shown && i === picked && i !== q.best && styles.rigWrong]}>
                <RigPicture rig={rig} />
                <PixelText size={11} color={CREAM} style={styles.centerText}>
                  {rig.kind === 'parallel' ? `${rig.volts} V, the lamp, and a ${rig.ohms} Ω resistor beside it` : rig.kind === 'series' ? `${rig.volts} V, ${rig.ohms} Ω, then the lamp` : rig.kind === 'twin' ? `${rig.volts} V, two lamps in a row` : `${rig.volts} V, a diode, then the lamp`}
                </PixelText>
                <PixelText size={13} color={GOLD} style={styles.centerText}>
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

const styles = StyleSheet.create({
  flex: { flex: 1 },
  game: { flex: 1, gap: 12, justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rowCenter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  centerText: { textAlign: 'center' },
  timer: { height: 10, borderWidth: 2, borderColor: INK, backgroundColor: DARK },
  timerFill: { height: '100%' },

  lampRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
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

  clockGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'center' },
  clock: { borderWidth: 3, borderColor: INK, alignItems: 'center', justifyContent: 'center' },
  clockOn: { backgroundColor: LIT, shadowColor: LIT, shadowRadius: 10, shadowOpacity: 0.8 },
  clockOff: { backgroundColor: '#3d3a46' },
  hand: { position: 'absolute', width: 3, bottom: '50%', transformOrigin: 'bottom' },
  clockPin: { width: 6, height: 6, borderRadius: 3 },

  rigRow: { flexDirection: 'row', gap: 10 },
  rigCard: { flex: 1, borderWidth: 3, borderColor: INK, backgroundColor: '#1f3550', padding: 8, gap: 8, alignItems: 'center', minHeight: 150 },
  rigBest: { borderColor: GREEN },
  rigWrong: { borderColor: RED },
  rigPic: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', minHeight: 54 },
  chipBat: { backgroundColor: GOLD, borderWidth: 3, borderColor: INK, paddingHorizontal: 5, paddingVertical: 4 },
  chipWire: { width: 8, height: 4, backgroundColor: WIRE_OFF },
  chipRes: { backgroundColor: '#eecf9b', borderWidth: 3, borderColor: '#7b4930', paddingHorizontal: 4, paddingVertical: 2 },
  chipLamp: { width: 22, height: 22, borderRadius: 11, backgroundColor: LIT, borderWidth: 3, borderColor: INK },
  chipDiode: { backgroundColor: '#a5608b', borderWidth: 3, borderColor: INK, paddingHorizontal: 4, paddingVertical: 2 },
  chipStack: { gap: 4, alignItems: 'center' },
});
