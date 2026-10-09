import { router } from 'expo-router';
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  type BoardState,
  autoOrient,
  canDropOn,
  drawSegment,
  eraseWire,
  isLocked,
  moveTile,
  placeTile,
  removeAt,
  rotateAt,
  stepsBetween,
  toEngineBoard,
  toggleSwitch,
} from '../board/board';
import { historyReducer } from '../board/history';
import {
  type SimulationResult,
  type Tile,
  battery,
  isTwoTerminal,
  led,
  parseToken,
  resistor,
  simulate,
} from '../engine';
import {
  cellsMeantDark,
  createLevelBoard,
  describeGoal,
  evaluateLevel,
  ledNamesFor,
  levelLabels,
  remainingParts,
} from '../levels/evaluate';
import { person } from '../game/cast';
import { isUnlocked } from '../game/save';
import { item } from '../game/shop';
import { chapterOf, levelNumber, nextLevel as levelAfter } from '../levels/levels';
import { phaseCount, phaseLevel, sabotage } from '../levels/boss';
import { dig, unneededParts } from '../levels/solution';
import {
  FRESH_RECORD,
  type PlayRecord,
  countStars,
  describeStar,
  starGoalMet,
  starGoalsFor,
} from '../levels/stars';
import type { LevelDef, PartKey } from '../levels/types';
import { BoardCanvas, type GhostPreview, type ScenePicker } from '../render/BoardScene';
import { currentSkin } from '../render/assets';
import { COLORS, LED_PALETTE, formatCurrent, formatOhms } from '../render/theme';
import { Grumble } from './characters/Grumble';
import { Pet } from './characters/Pets';
import { type Mood, Pip } from './characters/Pip';
import { Portrait } from './characters/Portrait';
import { JOB_ORDER, useGame } from './game';
import { buzz } from './haptics';
import { type Hint, HINTS, pickHint } from './hints';
import { Stars } from './kit';
import { TileIcon } from './TileIcon';

type Drag =
  { source: 'tray'; tile: Tile } | { source: 'board'; tile: Tile; from: number; id: number };

type Hover = { kind: 'cell'; cell: number } | { kind: 'trash' } | { kind: 'off' } | null;

/** A dragged part floats this far above the finger so the finger doesn't hide it. */
const LIFT = 56;
const ICON = 52;

const PART_ORDER: PartKey[] = [
  'battery',
  'led',
  'ledGreen',
  'ledBlue',
  'r100',
  'r220',
  'r470',
  'r1000',
];

function tileForPart(key: PartKey): Tile {
  if (key === 'battery') return battery(0);
  if (key === 'led') return led(0);
  if (key === 'ledGreen') return led(0, 'green');
  if (key === 'ledBlue') return led(0, 'blue');
  return resistor(Number(key.slice(1)), 0);
}

function partLabel(key: PartKey): string {
  if (key === 'battery') return '3 V';
  if (key === 'led') return 'Red';
  if (key === 'ledGreen') return 'Green';
  if (key === 'ledBlue') return 'Blue';
  return formatOhms(Number(key.slice(1)));
}

/** Pip's face for a hint. */
function moodFor(hint: Hint): Mood {
  if (hint.tone === 'success') return 'cheer';
  if (hint.text === HINTS.short || hint.text === HINTS.burned) return 'shocked';
  if (hint.tone === 'warning') return 'worried';
  if (hint.text === HINTS.faint) return 'thinking';
  return 'happy';
}

interface Payday {
  stars: number;
  earned: number;
  firstClear: boolean;
}

/**
 * One job (or the daily job, when `day` is set). The board, Pip and the pet, the goals and
 * star goals, and payday when it's done.
 */
export function LevelScreen({ level, day }: { level: LevelDef; day?: string }) {
  const { save, finishJob, finishDaily } = useGame();
  const [history, dispatch] = useReducer(historyReducer, level, (l) => ({
    board: createLevelBoard(l),
    past: [],
  }));
  const edit = useCallback(
    (fn: (b: BoardState) => BoardState) => dispatch({ type: 'edit', edit: fn }),
    [],
  );

  // While a wire is being drawn, the in-progress board is shown (and simulated) live,
  // then committed to the undo history as one step when the finger lifts.
  const [stroke, setStroke] = useState<BoardState | null>(null);
  const board = stroke ?? history.board;
  // Boss fights: the phase in play, its goals and tray, and the board it started from.
  const [phase, setPhase] = useState(0);
  const [phaseStart, setPhaseStart] = useState<BoardState | null>(null);
  const active = useMemo(() => phaseLevel(level, phase), [level, phase]);
  const lastPhase = phase === phaseCount(level) - 1;
  const result = useMemo(() => simulate(toEngineBoard(board)), [board]);
  const evaluation = useMemo(() => evaluateLevel(active, board), [active, board]);
  const labels = useMemo(() => levelLabels(level), [level]);
  const remaining = remainingParts(active, board);

  const [drag, setDrag] = useState<Drag | null>(null);
  const [hover, setHover] = useState<Hover>(null);
  const [shake, setShake] = useState({ id: 0, key: 0 });
  const [outOfWire, setOutOfWire] = useState(false);
  const [showWin, setShowWin] = useState(false);
  const [payday, setPayday] = useState<Payday | null>(null);
  const [celebrateKey, setCelebrateKey] = useState(0);
  const [showIntro, setShowIntro] = useState(!!level.newPart);
  const [sceneVersion, setSceneVersion] = useState(0);
  const [record, setRecord] = useState<PlayRecord>(FRESH_RECORD);
  // Pip's tip and the pet's words stay up until the board changes.
  const [said, setSaid] = useState<{ text: string; board: BoardState } | null>(null);
  const [petUsed, setPetUsed] = useState(false);
  const [petHop, setPetHop] = useState(0);
  const [crossed, setCrossed] = useState<Partial<Record<PartKey, number>>>({});
  const bestStars = useRef(0);

  const picker = useRef<ScenePicker | null>(null);
  const canvasOrigin = useRef({ x: 0, y: 0 });
  const canvasView = useRef<View>(null);
  const trayTop = useRef(Infinity);
  const trayView = useRef<View>(null);
  const [dragPos] = useState(() => new Animated.ValueXY());

  // Gesture callbacks are created once, so they read the latest state through refs.
  const live = useRef({ board, committed: history.board, drag, hover, remaining });
  useLayoutEffect(() => {
    live.current = { board, committed: history.board, drag, hover, remaining };
  });

  // An LED burned out on a board the player made: no "safe" star for this attempt.
  const burnedNow = result.tiles.some((t) => t?.status === 'BURNED_OUT');
  if (burnedNow && !stroke && history.past.length > 0 && !record.burned) {
    setRecord((r) => ({ ...r, burned: true }));
  }

  // Solved (on the committed board, not mid-stroke): pay out whenever the stars improve.
  const solved = !stroke && evaluation.complete;
  // A boss phase won: Grumble strikes back before the next one.
  const phaseCleared = solved && !lastPhase;
  const stars = solved && lastPhase ? countStars(active, board, evaluation, record) : 0;
  useEffect(() => {
    if (!stars || stars <= bestStars.current) return;
    const first = bestStars.current === 0;
    bestStars.current = stars;
    const payout = day ? finishDaily(day, stars) : finishJob(level.id, stars, level.boss);
    setPayday({ stars, earned: payout.earned, firstClear: first });
    setShowWin(true);
    if (first) setCelebrateKey((k) => k + 1);
    buzz.win();
  }, [stars, day, finishDaily, finishJob, level.id, level.boss]);

  const meantDark = useMemo(() => cellsMeantDark(active), [active]);
  const engineBoard = useMemo(() => toEngineBoard(board), [board]);
  const problemHint = pickHint(active.intro, engineBoard, result, evaluation, outOfWire, meantDark);
  const hint: Hint =
    said && said.board === history.board && problemHint.tone !== 'success'
      ? { text: said.text, tone: 'info' }
      : problemHint;
  const mood = moodFor(problemHint);
  useEffect(() => {
    if (mood === 'shocked') buzz.oops();
  }, [mood]);

  const pet = save.equipped.pet ? item(save.equipped.pet) : undefined;
  const petName = pet?.name.split(' ')[0] ?? '';

  /** Grumble strikes: sabotage the board as it stands and start the next phase. */
  const strike = () => {
    const struck = sabotage(level, phase + 1, history.board);
    dispatch({ type: 'reset', board: struck });
    setPhaseStart(struck);
    setPhase(phase + 1);
    setCrossed({});
    setSaid(null);
    buzz.thud();
  };

  const showTip = () => {
    if (!level.tip) return;
    buzz.tap();
    setSaid({ text: `💡 ${level.tip}`, board: history.board });
    setRecord((r) => ({ ...r, helped: true }));
  };

  const callPet = () => {
    if (pet?.kind !== 'pet') return;
    setPetHop((k) => k + 1);
    buzz.tap();
    const say = (text: string, on = history.board) => setSaid({ text, board: on });
    if (pet.ability === 'shiny') return say('Penny is collecting shiny sparks: +50% on this job!');
    if (petUsed) return say(`${petName} is having a rest. One trick per job!`);
    if (pet.ability === 'wise') {
      if (level.twist) return say('Hoo. No parts to sort in a twist job. Just turn things.');
      const spare = unneededParts(active);
      setCrossed(spare);
      say(
        Object.keys(spare).length
          ? 'Hoot crossed out the parts you won’t need. Hoo hoo!'
          : 'Hoot looked very closely: you’ll need every part in the tray.',
      );
    } else {
      const found = dig(active, history.board);
      if (!found) return say('Scout sniffed everywhere. Nothing to fix!');
      edit(() => found.board);
      const id = found.board.cells[found.cell]?.id;
      if (id) setShake((s) => ({ id, key: s.key + 1 }));
      say('Scout dug up a piece and put it in place!', found.board);
    }
    setPetUsed(true);
    setRecord((r) => ({ ...r, helped: true }));
  };
  const onSceneReady = useCallback(() => setSceneVersion((v) => v + 1), []);

  const measure = useCallback(() => {
    canvasView.current?.measureInWindow((x, y) => (canvasOrigin.current = { x, y }));
    trayView.current?.measureInWindow((_x, y) => (trayTop.current = y));
  }, []);

  // ---- Dragging parts (from the tray, or around the board) ----

  const hoverAt = useCallback((absX: number, absY: number): Hover => {
    const { drag: d } = live.current;
    if (d?.source === 'board' && absY >= trayTop.current) return { kind: 'trash' };
    const cell = picker.current?.cellAt(
      absX - canvasOrigin.current.x,
      absY - LIFT - canvasOrigin.current.y,
    );
    return cell == null ? { kind: 'off' } : { kind: 'cell', cell };
  }, []);

  const startDrag = useCallback(
    (d: Drag, absX: number, absY: number) => {
      measure();
      setDrag(d);
      dragPos.setValue({ x: absX - ICON / 2, y: absY - LIFT - ICON / 2 });
      setHover(hoverAt(absX, absY));
    },
    [dragPos, hoverAt, measure],
  );

  const moveDrag = useCallback(
    (absX: number, absY: number) => {
      dragPos.setValue({ x: absX - ICON / 2, y: absY - LIFT - ICON / 2 });
      const next = hoverAt(absX, absY);
      const prev = live.current.hover;
      const same =
        prev?.kind === next?.kind &&
        (next?.kind !== 'cell' || (prev?.kind === 'cell' && prev.cell === next.cell));
      if (!same) setHover(next);
    },
    [dragPos, hoverAt],
  );

  const endDrag = useCallback(
    (absX: number, absY: number) => {
      const { drag: d } = live.current;
      const h = hoverAt(absX, absY);
      if (d) {
        edit((b) => {
          if (d.source === 'tray') return h?.kind === 'cell' ? placeTile(b, h.cell, d.tile) : b;
          if (h?.kind === 'cell') return moveTile(b, d.from, h.cell);
          return removeAt(b, d.from); // dropped on the trash or off the board
        });
      }
      setDrag(null);
      setHover(null);
    },
    [edit, hoverAt],
  );

  const cancelDrag = useCallback(() => {
    setDrag(null);
    setHover(null);
  }, []);

  const shakeTile = useCallback((cell: number) => {
    const id = live.current.board.cells[cell]?.id;
    if (id) setShake((s) => ({ id, key: s.key + 1 }));
  }, []);

  // ---- The board: draw wires, tap to erase/turn/flip, drag parts ----

  const boardGesture = useMemo(() => {
    const g = {
      mode: 'none' as 'none' | 'draw' | 'move',
      start: { x: 0, y: 0 },
      last: -1,
      board: null as BoardState | null,
      out: false,
    };

    const extendStroke = (x: number, y: number) => {
      const cell = picker.current?.cellAt(x, y);
      if (cell == null || cell === g.last || !g.board) return;
      let b = g.board;
      let prev = g.last;
      for (const step of stepsBetween(b, prev, cell)) {
        const r = drawSegment(b, prev, step, level.wireBudget);
        if (r.outOfWire) {
          if (!g.out) setOutOfWire(true);
          g.out = true;
          break;
        }
        b = r.state;
        prev = step;
      }
      g.last = prev;
      if (b !== g.board) {
        g.board = b;
        setStroke(b);
      }
    };

    const tap = Gesture.Tap()
      .runOnJS(true)
      .maxDistance(10)
      .onEnd((e, success) => {
        if (!success) return;
        const b = live.current.board;
        const cell = picker.current?.cellAt(e.x, e.y);
        const tile = cell == null ? undefined : b.cells[cell]?.tile;
        if (cell == null || !tile) return;
        if (tile.kind === 'switch') edit((s) => toggleSwitch(s, cell));
        else if (tile.spin) {
          edit((s) => rotateAt(s, cell));
          setRecord((r) => ({ ...r, turns: r.turns + 1 }));
        } else if (isLocked(b, cell)) shakeTile(cell);
        else if (tile.kind === 'wire') edit((s) => eraseWire(s, cell));
        else edit((s) => rotateAt(s, cell));
        setOutOfWire(false);
      });

    const pan = Gesture.Pan()
      .runOnJS(true)
      .minDistance(6)
      .onBegin((e) => (g.start = { x: e.x, y: e.y }))
      .onStart((e) => {
        g.mode = 'none';
        const b = live.current.board;
        const cell = picker.current?.cellAt(g.start.x, g.start.y);
        if (cell == null) return;
        const placed = b.cells[cell];
        if (placed?.tile.kind === 'block') return;
        if (placed && placed.tile.kind !== 'wire' && !placed.tile.locked) {
          g.mode = 'move';
          startDrag(
            { source: 'board', tile: placed.tile, from: cell, id: placed.id },
            e.absoluteX,
            e.absoluteY,
          );
          return;
        }
        if (level.twist) return; // twist levels: turning only, no new wire
        // Empty cells, wires and fixed parts (like the battery) start a wire.
        g.mode = 'draw';
        g.last = cell;
        g.board = b;
        g.out = false;
        setOutOfWire(false);
        extendStroke(e.x, e.y);
      })
      .onUpdate((e) => {
        if (g.mode === 'move') moveDrag(e.absoluteX, e.absoluteY);
        else if (g.mode === 'draw') extendStroke(e.x, e.y);
      })
      .onEnd((e) => {
        if (g.mode === 'move') endDrag(e.absoluteX, e.absoluteY);
        if (g.mode === 'draw' && g.board && g.board !== live.current.committed) {
          const finished = g.board;
          edit(() => finished);
        }
      })
      .onFinalize(() => {
        if (g.mode === 'move') cancelDrag();
        if (g.mode === 'draw') setStroke(null);
        g.mode = 'none';
        g.board = null;
      });
    return Gesture.Exclusive(pan, tap);
  }, [cancelDrag, edit, endDrag, level.twist, level.wireBudget, moveDrag, shakeTile, startDrag]);

  const ghost: GhostPreview | null =
    drag && hover?.kind === 'cell' && canDropOn(board, hover.cell)
      ? {
          cell: hover.cell,
          tile: isTwoTerminal(drag.tile) ? autoOrient(board, hover.cell, drag.tile) : drag.tile,
        }
      : null;
  const draggingId = drag?.source === 'board' ? drag.id : null;
  const showFloating = drag && !ghost;

  const ledCount = Object.keys(labels).filter((k) => !k.startsWith('S')).length;
  const switchCount = Object.keys(labels).length - ledCount;
  const celebrateCell =
    result.tiles.findIndex((t) => t?.kind === 'led' && t.status === 'OK') >= 0
      ? result.tiles.findIndex((t) => t?.kind === 'led' && t.status === 'OK')
      : Math.floor(board.cells.length / 2);
  const ledNames = useMemo(() => ledNamesFor(level), [level]);
  const trayKeys = PART_ORDER.filter((k) => (active.inventory[k] ?? 0) > 0);
  const next = day ? undefined : levelAfter(level.id);
  const nextOpen = !!next && isUnlocked(save, JOB_ORDER, next.id);
  const lastInDistrict = !!next && chapterOf(next.id) !== chapterOf(level.id);
  const budget = active.wireBudget;
  const starGoals = starGoalsFor(level);
  const backdrop = currentSkin().board.backdrop;
  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/'));

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <View style={styles.toolbar}>
        <ToolButton label="‹" onPress={goBack} />
        <View style={styles.titleWrap}>
          <Text style={styles.levelTitle} numberOfLines={1}>
            {day ? level.title : `${levelNumber(level.id)} ${level.title}`}
          </Text>
          {level.job && (
            <Text style={styles.levelPlace} numberOfLines={1}>
              {level.phases ? `BOSS · Round ${phase + 1} of ${phaseCount(level)} · ` : ''}
              {level.job.place}
            </Text>
          )}
        </View>
        <ToolButton
          label="Undo"
          disabled={history.past.length === 0}
          onPress={() => dispatch({ type: 'undo' })}
        />
        <ToolButton
          label="Reset"
          onPress={() => {
            dispatch({ type: 'reset', board: phaseStart ?? createLevelBoard(level) });
            // A fresh attempt: burnouts and turns start over (help already given stays given).
            setRecord((r) => ({ ...FRESH_RECORD, helped: r.helped }));
          }}
        />
      </View>

      <View style={[styles.hint, hint.tone !== 'info' && styles[hint.tone]]}>
        <Pressable onPress={showTip} hitSlop={6} style={styles.pip}>
          <Pip size={58} mood={mood} hat={save.equipped.hat} />
          {level.tip && !said && <Text style={styles.tipBadge}>tip</Text>}
        </Pressable>
        <Text style={styles.hintText}>{hint.text}</Text>
        {pet?.kind === 'pet' && (
          <Pressable onPress={callPet} hitSlop={6} style={[styles.pet, petUsed && styles.petUsed]}>
            <Pet id={pet.id} size={44} hopKey={petHop} />
            <Text style={styles.petLabel}>
              {pet.ability === 'shiny' ? '+50%' : petUsed ? 'resting' : pet.ability}
            </Text>
          </Pressable>
        )}
      </View>

      <View style={styles.goals}>
        {evaluation.goals.map(({ goal, met }, i) => (
          <Text key={i} style={[styles.goal, met && styles.goalMet]}>
            {met ? '✓' : '○'} {describeGoal(goal, ledNames, switchCount)}
          </Text>
        ))}
        {budget !== null && (
          <Text style={[styles.goal, evaluation.wires >= budget && styles.goalLimit]}>
            ⚡ Wire used: {evaluation.wires} / {budget}
          </Text>
        )}
        <View style={styles.starGoals}>
          {starGoals.map((g, i) => {
            // Open while you work, earned once solved, lost as soon as it can't be had.
            const lost =
              (g.kind === 'safe' && record.burned) ||
              (g.kind === 'solo' && record.helped) ||
              (g.kind === 'turns' && record.turns > g.max);
            const done = solved && lastPhase;
            const earned = done && !lost && starGoalMet(g, active, board, record);
            const missed = lost || (done && !earned);
            return (
              <Text
                key={i}
                style={[
                  styles.starGoal,
                  earned && styles.starGoalMet,
                  missed && styles.starGoalLost,
                ]}
              >
                {earned ? '★' : '☆'} {describeStar(g, ledNames, switchCount)}
                {g.kind === 'turns' ? ` (${record.turns})` : ''}
              </Text>
            );
          })}
        </View>
      </View>

      <View
        ref={canvasView}
        style={[styles.canvasWrap, { backgroundColor: backdrop }]}
        onLayout={measure}
      >
        <BoardCanvas
          board={board}
          result={result}
          ghost={ghost}
          draggingId={draggingId}
          shake={shake}
          celebrateKey={celebrateKey}
          celebrateCell={celebrateCell}
          pickerRef={picker}
          onReady={onSceneReady}
        />
        <Labels
          board={board}
          result={result}
          picker={picker}
          hiddenId={draggingId}
          version={sceneVersion}
          labels={labels}
          ledCount={ledCount}
          switchCount={switchCount}
        />
        <GestureDetector gesture={boardGesture}>
          <View style={StyleSheet.absoluteFill} collapsable={false} />
        </GestureDetector>
      </View>

      <View ref={trayView} onLayout={measure} style={styles.trayWrap}>
        {drag?.source === 'board' ? (
          <View style={[styles.trash, hover?.kind === 'trash' && styles.trashActive]}>
            <Text style={styles.trashText}>Drop here to remove</Text>
          </View>
        ) : trayKeys.length === 0 ? null : (
          <View style={[styles.tray, trayKeys.length > 4 && styles.trayCompact]}>
            {trayKeys.map((key) => (
              <TraySlot
                key={key}
                size={trayKeys.length > 5 ? 44 : ICON}
                tile={tileForPart(key)}
                label={partLabel(key)}
                count={remaining[key] ?? 0}
                spare={crossed[key] ?? 0}
                all={active.inventory[key] ?? 0}
                onStart={startDrag}
                onMove={moveDrag}
                onEnd={endDrag}
                onCancel={cancelDrag}
              />
            ))}
          </View>
        )}
        <Text style={styles.howTo}>
          {level.twist
            ? 'Tap a piece to turn it · Tap a switch to flip it'
            : 'Drag across the board to draw wire · Tap a wire to erase it\nTap a part to turn it · Drag a part off the board to remove it'}
        </Text>
      </View>

      {showFloating && (
        <Animated.View
          pointerEvents="none"
          style={[styles.floating, { transform: dragPos.getTranslateTransform() }]}
        >
          <TileIcon tile={drag.tile} size={ICON} />
        </Animated.View>
      )}

      {phaseCleared && (
        <GrumbleStrike
          line={level.phases![phase]!.grumble}
          round={phase + 1}
          rounds={phaseCount(level)}
          onFight={strike}
        />
      )}

      {showWin && payday && (
        <WinCard
          level={level}
          payday={payday}
          onKeepPlaying={() => setShowWin(false)}
          primary={
            nextOpen && next && !lastInDistrict
              ? { label: 'Next job ›', onPress: () => router.replace(`/level/${next.id}`) }
              : { label: 'Back to town ›', onPress: goBack }
          }
          secondary={
            nextOpen && next && !lastInDistrict ? { label: 'Town', onPress: goBack } : null
          }
        />
      )}

      {showIntro && level.newPart && (
        <View style={styles.modalBackdrop}>
          <View style={styles.modal}>
            <Text style={styles.modalKicker}>New part</Text>
            <TileIcon tile={parseToken(level.newPart.token) ?? resistor(220)} size={72} />
            <Text style={styles.modalTitle}>{level.newPart.name}</Text>
            <Text style={styles.modalText}>{level.newPart.text}</Text>
            <ToolButton label="Got it!" primary onPress={() => setShowIntro(false)} />
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

/** Between boss rounds: Grumble gloats and sabotages the board. */
function GrumbleStrike({
  line,
  round,
  rounds,
  onFight,
}: {
  line: string;
  round: number;
  rounds: number;
  onFight: () => void;
}) {
  const shake = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    buzz.oops();
    Animated.sequence(
      [8, -8, 6, -6, 3, 0].map((x) =>
        Animated.timing(shake, { toValue: x, duration: 60, useNativeDriver: true }),
      ),
    ).start();
  }, [shake]);
  return (
    <View style={styles.modalBackdrop}>
      <Animated.View style={[styles.strike, { transform: [{ translateX: shake }] }]}>
        <Text style={styles.strikeKicker}>
          ROUND {round} CLEARED · {rounds - round} TO GO
        </Text>
        <View style={styles.hearts}>
          {Array.from({ length: rounds }, (_, i) => (
            <View key={i} style={[styles.heart, i < round && styles.heartGone]} />
          ))}
        </View>
        <Grumble size={120} />
        <Text style={styles.strikeName}>Grumble</Text>
        <Text style={styles.strikeLine}>“{line}”</Text>
        <ToolButton label="Bring it on! ⚡" primary onPress={onFight} />
      </Animated.View>
    </View>
  );
}

/** Payday: the client says thanks, the stars pop in one by one, and the sparks count up. */
function WinCard({
  level,
  payday,
  onKeepPlaying,
  primary,
  secondary,
}: {
  level: LevelDef;
  payday: Payday;
  onKeepPlaying: () => void;
  primary: { label: string; onPress: () => void };
  secondary: { label: string; onPress: () => void } | null;
}) {
  const [shownStars, setShownStars] = useState(0);
  const [sparks, setSparks] = useState(0);
  const rise = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(rise, { toValue: 1, friction: 7, useNativeDriver: true }).start();
    const timers = [1, 2, 3]
      .filter((s) => s <= payday.stars)
      .map((s) =>
        setTimeout(
          () => {
            setShownStars(s);
            buzz.thud();
          },
          250 + s * 300,
        ),
      );
    const steps = 20;
    let i = 0;
    const counter = setInterval(() => {
      i++;
      setSparks(Math.round((payday.earned * i) / steps));
      if (i >= steps) clearInterval(counter);
    }, 40);
    return () => {
      timers.forEach(clearTimeout);
      clearInterval(counter);
    };
  }, [payday, rise]);
  const client = level.job ? person(level.job.client) : null;
  const translateY = rise.interpolate({ inputRange: [0, 1], outputRange: [300, 0] });
  return (
    <Animated.View style={[styles.winCard, { transform: [{ translateY }] }]}>
      <Text style={styles.winTitle}>
        {payday.firstClear ? (level.boss ? 'Boss beaten!' : 'Job done!') : 'New best!'}
      </Text>
      <Stars earned={shownStars} size={40} />
      {client && level.job && (
        <View style={styles.thanks}>
          <Portrait look={client.look} size={52} />
          <Text style={styles.thanksText}>“{level.job.thanks}”</Text>
        </View>
      )}
      <Text style={styles.paid}>
        {payday.earned > 0 ? `+⚡ ${sparks}` : 'No new stars this time'}
      </Text>
      {payday.stars < 3 && (
        <Text style={styles.winHint}>Missing a star? Check the ☆ goals and try again.</Text>
      )}
      <View style={styles.winButtons}>
        <ToolButton label="Keep playing" onPress={onKeepPlaying} />
        {secondary && <ToolButton label={secondary.label} onPress={secondary.onPress} />}
        <ToolButton label={primary.label} primary onPress={primary.onPress} />
      </View>
    </Animated.View>
  );
}

function ToolButton({
  label,
  onPress,
  disabled = false,
  primary = false,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  primary?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.toolButton,
        primary && styles.toolPrimary,
        pressed && styles.toolPressed,
        disabled && styles.toolDisabled,
      ]}
    >
      <Text style={[styles.toolText, primary && styles.toolPrimaryText]}>{label}</Text>
    </Pressable>
  );
}

function TraySlot({
  size,
  tile,
  label,
  count,
  spare,
  all,
  onStart,
  onMove,
  onEnd,
  onCancel,
}: {
  size: number;
  tile: Tile;
  label: string;
  count: number;
  /** Hoot says this many of the part are not needed. */
  spare: number;
  /** How many the level gives. */
  all: number;
  onStart: (d: Drag, x: number, y: number) => void;
  onMove: (x: number, y: number) => void;
  onEnd: (x: number, y: number) => void;
  onCancel: () => void;
}) {
  const gesture = useMemo(() => {
    let ended = false;
    return Gesture.Pan()
      .runOnJS(true)
      .enabled(count > 0)
      .minDistance(2)
      .onStart((e) => {
        ended = false;
        onStart({ source: 'tray', tile }, e.absoluteX, e.absoluteY);
      })
      .onUpdate((e) => onMove(e.absoluteX, e.absoluteY))
      .onEnd((e) => {
        ended = true;
        onEnd(e.absoluteX, e.absoluteY);
      })
      .onFinalize(() => {
        if (!ended) onCancel();
      });
  }, [count, tile, onStart, onMove, onEnd, onCancel]);

  return (
    <GestureDetector gesture={gesture}>
      <View style={[styles.slot, (count <= 0 || spare >= all) && styles.slotEmpty]}>
        <TileIcon tile={tile} size={size} />
        <Text style={styles.slotLabel}>{label}</Text>
        {spare > 0 && (
          <View style={styles.crossed} pointerEvents="none">
            <Text style={styles.crossedText}>{spare >= all ? '✕' : `need ${all - spare}`}</Text>
          </View>
        )}
        <View style={styles.countBadge}>
          <Text style={styles.countText}>×{Math.max(0, count)}</Text>
        </View>
      </View>
    </GestureDetector>
  );
}

/** Value tags floating over parts: "220 Ω", "3 V", LED names and current, switch state. */
function Labels({
  board,
  result,
  picker,
  hiddenId,
  version,
  labels,
  ledCount,
  switchCount,
}: {
  board: BoardState;
  result: SimulationResult;
  picker: React.RefObject<ScenePicker | null>;
  hiddenId: number | null;
  version: number;
  labels: Record<string, number>;
  ledCount: number;
  switchCount: number;
}) {
  if (!picker.current || version === 0) return null;
  const nameAt = new Map(Object.entries(labels).map(([name, cell]) => [cell, name]));
  const tags: { key: number; x: number; y: number; text: string; tone?: string }[] = [];
  board.cells.forEach((placed, cell) => {
    if (!placed || placed.id === hiddenId) return;
    const t = placed.tile;
    const r = result.tiles[cell];
    const name = nameAt.get(cell);
    let text: string | null = null;
    let tone: string | undefined;
    if (t.kind === 'resistor') text = formatOhms(t.ohms);
    else if (t.kind === 'battery') text = `${t.volts} V`;
    else if (t.kind === 'switch') {
      text = `${switchCount > 1 && name ? `${name} ` : ''}${t.closed ? 'ON' : 'OFF'}`;
      tone = t.closed ? 'rgba(91,191,143,0.95)' : undefined;
    } else if (t.kind === 'led') {
      // Show the current even when it is too faint to glow: that is how hogging shows up.
      const flowing = r && r.current > 1e-4 && r.status !== 'BURNED_OUT';
      const prefix = ledCount > 1 && name ? name : '';
      text = flowing
        ? `${prefix ? `${prefix} · ` : ''}${formatCurrent(r.current)}`
        : prefix || null;
      tone = r?.status === 'OK' ? LED_PALETTE[t.color].tag : undefined;
    }
    if (!text) return;
    const p = picker.current!.project(cell, 0.9);
    tags.push({ key: placed.id, x: p.x, y: p.y, text, tone });
  });
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {tags.map((tag) => (
        <View
          key={tag.key}
          style={[
            styles.tag,
            tag.tone ? { backgroundColor: tag.tone } : null,
            { left: tag.x - 36, top: tag.y - 30 },
          ]}
        >
          <Text style={[styles.tagText, tag.tone && styles.tagToneText]}>{tag.text}</Text>
        </View>
      ))}
    </View>
  );
}

const shadow = {
  shadowColor: '#6e5f8a',
  shadowOpacity: 0.12,
  shadowRadius: 10,
  shadowOffset: { width: 0, height: 4 },
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 12,
    marginTop: 4,
  },
  titleWrap: { flex: 1 },
  levelTitle: { fontSize: 17, fontWeight: '900', color: COLORS.text },
  levelPlace: { fontSize: 12, fontWeight: '700', color: COLORS.textSoft },
  toolButton: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: COLORS.card,
    ...shadow,
  },
  toolPrimary: { backgroundColor: COLORS.success },
  toolPressed: { transform: [{ scale: 0.95 }] },
  toolDisabled: { opacity: 0.4 },
  toolText: { fontSize: 14, fontWeight: '800', color: COLORS.text },
  toolPrimaryText: { color: '#fff' },
  hint: {
    marginHorizontal: 12,
    marginTop: 8,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 20,
    backgroundColor: COLORS.card,
    minHeight: 70,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    ...shadow,
  },
  pip: { alignItems: 'center' },
  tipBadge: {
    marginTop: -8,
    paddingHorizontal: 6,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#ffd56b',
    fontSize: 10,
    fontWeight: '900',
    color: COLORS.text,
  },
  pet: { alignItems: 'center' },
  petUsed: { opacity: 0.5 },
  petLabel: { fontSize: 10, fontWeight: '900', color: COLORS.textSoft, marginTop: -4 },
  warning: { backgroundColor: '#ffe9e4' },
  success: { backgroundColor: '#e3f6ea' },
  info: {},
  hintText: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '700',
    color: COLORS.text,
    flex: 1,
  },
  goals: { marginHorizontal: 18, marginTop: 8, gap: 2 },
  goal: { fontSize: 13, fontWeight: '700', color: COLORS.textSoft },
  goalMet: { color: COLORS.success },
  goalLimit: { color: COLORS.danger },
  starGoals: { marginTop: 2 },
  starGoal: { fontSize: 12, fontWeight: '700', color: '#b3a6c4' },
  starGoalMet: { color: '#e0a91f' },
  starGoalLost: { color: '#c9bfd3', textDecorationLine: 'line-through' },
  crossed: {
    position: 'absolute',
    top: 0,
    left: -6,
    right: -6,
    bottom: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  crossedText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#fff',
    backgroundColor: COLORS.danger,
    paddingHorizontal: 6,
    borderRadius: 8,
    overflow: 'hidden',
  },
  canvasWrap: { flex: 1 },
  trayWrap: { paddingHorizontal: 12, paddingBottom: 6, minHeight: 112 },
  tray: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 18,
    flexWrap: 'wrap',
    backgroundColor: COLORS.card,
    borderRadius: 24,
    paddingVertical: 10,
    paddingHorizontal: 10,
    ...shadow,
  },
  trayCompact: { gap: 10, paddingHorizontal: 6 },
  slot: { alignItems: 'center', gap: 4 },
  slotEmpty: { opacity: 0.35 },
  slotLabel: { fontSize: 12, fontWeight: '700', color: COLORS.textSoft },
  countBadge: {
    position: 'absolute',
    top: -6,
    right: -10,
    minWidth: 26,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 999,
    backgroundColor: COLORS.text,
    alignItems: 'center',
  },
  countText: { fontSize: 11, fontWeight: '800', color: '#fff' },
  howTo: {
    textAlign: 'center',
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '600',
    color: COLORS.textSoft,
    marginTop: 6,
  },
  trash: {
    height: 92,
    borderRadius: 24,
    borderWidth: 3,
    borderStyle: 'dashed',
    borderColor: COLORS.danger,
    backgroundColor: '#fff1ee',
    alignItems: 'center',
    justifyContent: 'center',
  },
  trashActive: { backgroundColor: '#ffd9d2' },
  trashText: { fontSize: 16, fontWeight: '800', color: COLORS.danger },
  floating: { position: 'absolute', left: 0, top: 0, opacity: 0.9 },
  tag: {
    position: 'absolute',
    width: 72,
    paddingVertical: 2,
    borderRadius: 10,
    backgroundColor: 'rgba(255,250,244,0.92)',
    alignItems: 'center',
  },
  tagText: { fontSize: 12, fontWeight: '800', color: COLORS.text },
  tagToneText: { color: '#fff' },
  winCard: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 40,
    padding: 18,
    borderRadius: 24,
    backgroundColor: COLORS.card,
    alignItems: 'center',
    gap: 12,
    ...shadow,
    shadowOpacity: 0.25,
  },
  strike: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 28,
    padding: 22,
    backgroundColor: '#ece9f6',
    alignItems: 'center',
    gap: 8,
  },
  strikeKicker: { fontSize: 12, fontWeight: '900', color: '#6d6890', letterSpacing: 1 },
  hearts: { flexDirection: 'row', gap: 6 },
  heart: { width: 34, height: 10, borderRadius: 5, backgroundColor: '#7d7a9c' },
  heartGone: { backgroundColor: '#d9d5e8' },
  strikeName: { fontSize: 14, fontWeight: '900', color: '#6d6890' },
  strikeLine: {
    fontSize: 17,
    lineHeight: 23,
    fontWeight: '800',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 6,
  },
  winTitle: { fontSize: 26, fontWeight: '900', color: COLORS.text },
  thanks: { flexDirection: 'row', alignItems: 'center', gap: 10, alignSelf: 'stretch' },
  thanksText: { flex: 1, fontSize: 15, lineHeight: 20, fontWeight: '700', color: COLORS.text },
  paid: { fontSize: 24, fontWeight: '900', color: '#e0a91f' },
  winHint: { fontSize: 12, fontWeight: '700', color: COLORS.textSoft },
  winButtons: { flexDirection: 'row', gap: 10, flexWrap: 'wrap', justifyContent: 'center' },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(74,64,88,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modal: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 28,
    padding: 24,
    backgroundColor: COLORS.card,
    alignItems: 'center',
    gap: 12,
  },
  modalKicker: { fontSize: 13, fontWeight: '800', color: COLORS.textSoft, letterSpacing: 1 },
  modalTitle: { fontSize: 26, fontWeight: '900', color: COLORS.text },
  modalText: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '600',
    color: COLORS.text,
    textAlign: 'center',
  },
});
