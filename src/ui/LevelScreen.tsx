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
import { Animated, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
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
import { item } from '../game/shop';
import { levelNumber } from '../levels/levels';
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
import type { GhostPreview, ScenePicker } from '../puzzle-view/types';
import { PixelBoard } from '../puzzle-view/PixelBoard';
import { LED_PALETTE, formatCurrent, formatOhms } from '../render/theme';
import { useGame } from './game';
import { buzz } from './haptics';
import { type Hint, HINTS, pickHint } from './hints';
import {
  CREAM,
  CREAM_SHADE,
  GOLD,
  GOLD_DARK,
  GREEN,
  INK,
  NIGHT,
  NIGHT_DEEP,
  Panel,
  PixelButton,
  PixelText,
  Portrait,
  RED,
  TEXT,
  TEXT_SOFT,
} from './pixel';
import { PartIcon } from '../puzzle-view/PartIcon';

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

  // Dev only, in the browser: `__solve()` in the console builds the known solution, for
  // checking how solved boards and payday look without drawing every wire by hand.
  useEffect(() => {
    if (!__DEV__ || Platform.OS !== 'web') return;
    (globalThis as Record<string, unknown>).__solve = () =>
      edit((b) => {
        let next = b;
        for (let i = 0; i < 80; i++) {
          const found = dig(active, next);
          if (!found) break;
          next = found.board;
        }
        return next;
      });
  }, [active, edit]);

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
  const trayLeft = useRef(Infinity);
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
  // A buzz when something goes bang (a short circuit, a burned-out LED).
  const shocked = problemHint.text === HINTS.short || problemHint.text === HINTS.burned;
  useEffect(() => {
    if (shocked) buzz.oops();
  }, [shocked]);

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
          ? 'Hoot crossed out the parts you won’t need. Squawk!'
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
    trayView.current?.measureInWindow((x) => (trayLeft.current = x));
  }, []);

  // ---- Dragging parts (from the tray, or around the board) ----

  const hoverAt = useCallback((absX: number, absY: number): Hover => {
    const { drag: d } = live.current;
    if (d?.source === 'board' && absX >= trayLeft.current) return { kind: 'trash' };
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
  const budget = active.wireBudget;
  const starGoals = starGoalsFor(level);
  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/'));


  return (
    <SafeAreaView style={styles.screen} edges={['left', 'right']}>
      {/* Left: the job, Pip's advice, and what counts as done. */}
      <View style={styles.side}>
        <View style={styles.titleRow}>
          <PixelButton label="‹" tone="cream" size={16} onPress={goBack} />
          <View style={styles.titleWrap}>
            <PixelText size={15} color={GOLD} shadow numberOfLines={1}>
              {day ? level.title : `${levelNumber(level.id)} ${level.title}`}
            </PixelText>
            {level.job && (
              <PixelText size={11} color={MUTED} shadow numberOfLines={1}>
                {level.phases ? `BOSS · round ${phase + 1}/${phaseCount(level)} · ` : ''}
                {level.job.place}
              </PixelText>
            )}
          </View>
        </View>

        <View style={[styles.hint, hint.tone === 'warning' && styles.hintWarning, hint.tone === 'success' && styles.hintSuccess]}>
          <Pressable onPress={showTip} hitSlop={6} style={styles.pip}>
            <Portrait who="pip" size={36} />
            {level.tip && !said && (
              <View style={styles.tipBadge}>
                <PixelText size={9} color={TEXT}>
                  tip
                </PixelText>
              </View>
            )}
          </Pressable>
          <PixelText size={12} style={styles.flex}>
            {hint.text}
          </PixelText>
        </View>

        <ScrollView style={styles.flex} contentContainerStyle={styles.goals}>
          {evaluation.goals.map(({ goal, met }, i) => (
            <PixelText key={i} size={12} color={met ? GREEN : CREAM} shadow>
              {met ? '✓' : '○'} {describeGoal(goal, ledNames, switchCount)}
            </PixelText>
          ))}
          {budget !== null && (
            <PixelText size={12} color={evaluation.wires >= budget ? RED : CREAM} shadow>
              ⚡ Wire: {evaluation.wires} / {budget}
            </PixelText>
          )}
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
              <PixelText
                key={`s${i}`}
                size={11}
                color={earned ? GOLD : missed ? '#6b6585' : MUTED}
                shadow
                style={missed ? styles.lost : undefined}
              >
                {earned ? '★' : '☆'} {describeStar(g, ledNames, switchCount)}
                {g.kind === 'turns' ? ` (${record.turns})` : ''}
              </PixelText>
            );
          })}
        </ScrollView>

        <View style={styles.tools}>
          <PixelButton
            label="Undo"
            tone="cream"
            size={12}
            disabled={history.past.length === 0}
            onPress={() => dispatch({ type: 'undo' })}
          />
          <PixelButton
            label="Reset"
            tone="cream"
            size={12}
            onPress={() => {
              dispatch({ type: 'reset', board: phaseStart ?? createLevelBoard(level) });
              // A fresh attempt: burnouts and turns start over (help already given stays given).
              setRecord((r) => ({ ...FRESH_RECORD, helped: r.helped }));
            }}
          />
          {pet?.kind === 'pet' && (
            <Pressable onPress={callPet} hitSlop={6} style={[styles.pet, petUsed && styles.petUsed]}>
              <PetFace id={pet.id} hopKey={petHop} />
              <PixelText size={9} color={MUTED} shadow>
                {pet.ability === 'shiny' ? '+50%' : petUsed ? 'resting' : pet.ability}
              </PixelText>
            </Pressable>
          )}
        </View>
      </View>

      {/* Middle: the workbench. */}
      <View ref={canvasView} style={styles.bench} onLayout={measure}>
        <PixelBoard
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
        <View style={styles.howTo} pointerEvents="none">
          <PixelText size={10} color={MUTED} shadow>
            {level.twist
              ? 'Tap a piece to turn it · Tap a switch to flip it'
              : 'Drag to draw wire · Tap wire to erase · Tap a part to turn it'}
          </PixelText>
        </View>
      </View>

      {/* Right: the parts. Drag one in; drag a part back here to put it away. */}
      <View ref={trayView} onLayout={measure} style={styles.tray}>
        {drag?.source === 'board' ? (
          <View style={[styles.trash, hover?.kind === 'trash' && styles.trashActive]}>
            <PixelText size={12} color={CREAM} shadow style={styles.center}>
              Drop here to put it away
            </PixelText>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.trayList} showsVerticalScrollIndicator={false}>
            <PixelText size={11} color={MUTED} shadow>
              PARTS
            </PixelText>
            {trayKeys.map((key) => (
              <TraySlot
                key={key}
                size={trayKeys.length > 3 ? 38 : 46}
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
            {trayKeys.length === 0 && (
              <PixelText size={11} color={MUTED} shadow style={styles.center}>
                Everything’s on the board
              </PixelText>
            )}
          </ScrollView>
        )}
      </View>

      {showFloating && (
        <Animated.View pointerEvents="none" style={[styles.floating, { transform: dragPos.getTranslateTransform() }]}>
          <PartIcon tile={drag.tile} size={ICON} />
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

      {showWin && payday && <WinCard level={level} payday={payday} onKeepPlaying={() => setShowWin(false)} onDone={goBack} day={day} />}

      {showIntro && level.newPart && (
        <View style={styles.cover}>
          <Panel style={styles.modal}>
            <PixelText size={11} color={TEXT_SOFT}>
              NEW PART
            </PixelText>
            <View style={styles.introRow}>
              <View style={styles.partFrame}>
                <PartIcon tile={parseToken(level.newPart.token) ?? resistor(220)} size={64} />
              </View>
              <View style={styles.flex}>
                <PixelText size={20}>{level.newPart.name}</PixelText>
                <PixelText size={13}>{level.newPart.text}</PixelText>
              </View>
            </View>
            <View style={styles.modalButtons}>
              <PixelButton label="Got it!" onPress={() => setShowIntro(false)} />
            </View>
          </Panel>
        </View>
      )}
    </SafeAreaView>
  );
}

/** The pet's portrait; it hops when it does its trick. */
function PetFace({ id, hopKey }: { id: string; hopKey: number }) {
  const hop = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!hopKey) return;
    Animated.sequence([
      Animated.timing(hop, { toValue: -10, duration: 120, useNativeDriver: true }),
      Animated.spring(hop, { toValue: 0, friction: 4, useNativeDriver: true }),
    ]).start();
  }, [hopKey, hop]);
  return (
    <Animated.View style={{ transform: [{ translateY: hop }] }}>
      <Portrait who={id} size={30} />
    </Animated.View>
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
      [8, -8, 6, -6, 3, 0].map((x) => Animated.timing(shake, { toValue: x, duration: 60, useNativeDriver: true })),
    ).start();
  }, [shake]);
  return (
    <View style={styles.cover}>
      <Animated.View style={{ transform: [{ translateX: shake }] }}>
        <Panel style={styles.modal} tone="night">
          <View style={styles.introRow}>
            <Portrait who="grumble" size={84} />
            <View style={styles.flex}>
              <PixelText size={11} color={MUTED} shadow>
                ROUND {round} CLEARED · {rounds - round} TO GO
              </PixelText>
              <View style={styles.hearts}>
                {Array.from({ length: rounds }, (_, i) => (
                  <View key={i} style={[styles.heart, i < round && styles.heartGone]} />
                ))}
              </View>
              <PixelText size={13} color={GOLD} shadow>
                Grumble
              </PixelText>
              <PixelText size={15} color={CREAM} shadow>
                “{line}”
              </PixelText>
            </View>
          </View>
          <View style={styles.modalButtons}>
            <PixelButton label="Bring it on! ⚡" onPress={onFight} />
          </View>
        </Panel>
      </Animated.View>
    </View>
  );
}

/** Payday: the client says thanks, the stars pop in one by one, and the sparks count up. */
function WinCard({
  level,
  payday,
  onKeepPlaying,
  onDone,
  day,
}: {
  level: LevelDef;
  payday: Payday;
  onKeepPlaying: () => void;
  onDone: () => void;
  day?: string;
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
  const translateY = rise.interpolate({ inputRange: [0, 1], outputRange: [300, 0] });
  return (
    <View style={styles.cover}>
      <Animated.View style={[styles.winWrap, { transform: [{ translateY }] }]}>
        <Panel style={styles.modal}>
          <View style={styles.winTop}>
            <PixelText size={22}>
              {payday.firstClear ? (level.boss ? 'Boss beaten!' : 'Job done!') : 'New best!'}
            </PixelText>
            <View style={styles.flex} />
            <View style={styles.starsRow}>
              {[1, 2, 3].map((s) => (
                <PixelText key={s} size={30} color={s <= shownStars ? GOLD : CREAM_SHADE} shadow={s <= shownStars}>
                  ★
                </PixelText>
              ))}
            </View>
          </View>
          {level.job && !day && (
            <View style={styles.introRow}>
              <Portrait who={level.job.client} size={52} />
              <PixelText size={13} style={styles.flex}>
                “{level.job.thanks}”
              </PixelText>
            </View>
          )}
          <View style={styles.winTop}>
            <PixelText size={18} color={payday.earned > 0 ? GOLD_DARK : TEXT_SOFT}>
              {payday.earned > 0 ? `+⚡ ${sparks} sparks` : 'No new stars this time'}
            </PixelText>
            <View style={styles.flex} />
            {payday.stars < 3 && (
              <PixelText size={11} color={TEXT_SOFT}>
                Missing a star? Check the ☆ goals.
              </PixelText>
            )}
          </View>
          <View style={styles.modalButtons}>
            <PixelButton label="Keep playing" tone="cream" onPress={onKeepPlaying} />
            <PixelButton label={day ? 'Back to town' : 'Back outside ›'} onPress={onDone} />
          </View>
        </Panel>
      </Animated.View>
    </View>
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
        <View style={styles.partFrame}>
          <PartIcon tile={tile} size={size} />
        </View>
        <PixelText size={10} color={CREAM} shadow>
          {label}
        </PixelText>
        {spare > 0 && (
          <View style={styles.crossed} pointerEvents="none">
            <View style={styles.crossedTag}>
              <PixelText size={10} color={CREAM} shadow>
                {spare >= all ? '✕' : `need ${all - spare}`}
              </PixelText>
            </View>
          </View>
        )}
        <View style={styles.countBadge}>
          <PixelText size={10} color={CREAM}>
            ×{Math.max(0, count)}
          </PixelText>
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
      tone = t.closed ? '#3f7a52' : undefined;
    } else if (t.kind === 'led') {
      // Show the current even when it is too faint to glow: that is how hogging shows up.
      const flowing = r && r.current > 1e-4 && r.status !== 'BURNED_OUT';
      const prefix = ledCount > 1 && name ? name : '';
      text = flowing ? `${prefix ? `${prefix} · ` : ''}${formatCurrent(r.current)}` : prefix || null;
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
          style={[styles.tag, tag.tone ? { backgroundColor: tag.tone } : null, { left: tag.x - 38, top: tag.y - 30 }]}
        >
          <PixelText size={10} color={CREAM} shadow>
            {tag.text}
          </PixelText>
        </View>
      ))}
    </View>
  );
}

const MUTED = '#b9b2db';

const styles = StyleSheet.create({
  screen: { flex: 1, flexDirection: 'row', backgroundColor: NIGHT_DEEP },
  flex: { flex: 1 },
  center: { textAlign: 'center' },
  side: { width: 236, padding: 10, gap: 8, backgroundColor: NIGHT, borderRightWidth: 2, borderColor: INK },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  titleWrap: { flex: 1 },
  hint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 6,
    backgroundColor: CREAM,
    borderWidth: 2,
    borderColor: INK,
    borderRadius: 5,
    minHeight: 64,
  },
  hintWarning: { backgroundColor: '#f6d6c8' },
  hintSuccess: { backgroundColor: '#dcefc4' },
  pip: { alignItems: 'center' },
  tipBadge: {
    marginTop: -8,
    paddingHorizontal: 5,
    backgroundColor: GOLD,
    borderWidth: 1.5,
    borderColor: INK,
    borderRadius: 3,
  },
  goals: { gap: 3, paddingVertical: 2 },
  lost: { textDecorationLine: 'line-through' },
  tools: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pet: { alignItems: 'center', marginLeft: 'auto' },
  petUsed: { opacity: 0.45 },
  bench: { flex: 1 },
  howTo: { position: 'absolute', left: 8, right: 8, bottom: 6, alignItems: 'center' },
  tray: { width: 104, backgroundColor: NIGHT, borderLeftWidth: 2, borderColor: INK, paddingVertical: 8 },
  trayList: { alignItems: 'center', gap: 10, paddingBottom: 10 },
  slot: { alignItems: 'center', gap: 2 },
  slotEmpty: { opacity: 0.35 },
  partFrame: {
    padding: 4,
    backgroundColor: CREAM,
    borderWidth: 2,
    borderColor: INK,
    borderRadius: 5,
    borderBottomWidth: 4,
    borderBottomColor: CREAM_SHADE,
  },
  countBadge: {
    position: 'absolute',
    top: -6,
    right: -12,
    paddingHorizontal: 4,
    backgroundColor: INK,
    borderRadius: 3,
  },
  crossed: { position: 'absolute', top: 0, left: -8, right: -8, bottom: 14, alignItems: 'center', justifyContent: 'center' },
  crossedTag: { paddingHorizontal: 5, backgroundColor: RED, borderWidth: 1.5, borderColor: INK, borderRadius: 3 },
  trash: {
    flex: 1,
    margin: 8,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: RED,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 6,
  },
  trashActive: { backgroundColor: 'rgba(209,75,52,0.35)' },
  floating: { position: 'absolute', left: 0, top: 0, opacity: 0.9 },
  tag: {
    position: 'absolute',
    width: 76,
    paddingVertical: 1,
    backgroundColor: 'rgba(20,27,27,0.86)',
    borderRadius: 3,
    alignItems: 'center',
  },
  cover: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(13,15,30,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  modal: { width: 460, maxWidth: '100%' },
  introRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 6 },
  modalButtons: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 8 },
  hearts: { flexDirection: 'row', gap: 6, marginVertical: 4 },
  heart: { width: 30, height: 9, backgroundColor: RED, borderWidth: 1.5, borderColor: INK, borderRadius: 2 },
  heartGone: { backgroundColor: '#3a3656' },
  winWrap: { width: 460, maxWidth: '100%' },
  winTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  starsRow: { flexDirection: 'row', gap: 2 },
});
