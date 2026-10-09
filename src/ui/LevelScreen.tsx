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
import { chapterOf, levelNumber, nextLevel as levelAfter } from '../levels/levels';
import type { LevelDef, PartKey } from '../levels/types';
import { BoardCanvas, type GhostPreview, type ScenePicker } from '../render/BoardScene';
import { COLORS, LED_PALETTE, formatCurrent, formatOhms } from '../render/theme';
import { pickHint } from './hints';
import { useProgress } from './progress';
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

export function LevelScreen({ level }: { level: LevelDef }) {
  const { markComplete } = useProgress();
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
  const result = useMemo(() => simulate(toEngineBoard(board)), [board]);
  const evaluation = useMemo(() => evaluateLevel(level, board), [level, board]);
  const labels = useMemo(() => levelLabels(level), [level]);
  const remaining = remainingParts(level, board);

  const [drag, setDrag] = useState<Drag | null>(null);
  const [hover, setHover] = useState<Hover>(null);
  const [shake, setShake] = useState({ id: 0, key: 0 });
  const [outOfWire, setOutOfWire] = useState(false);
  const [won, setWon] = useState(false);
  const [showWin, setShowWin] = useState(false);
  const [celebrateKey, setCelebrateKey] = useState(0);
  const [showIntro, setShowIntro] = useState(!!level.newPart);
  const [sceneVersion, setSceneVersion] = useState(0);

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

  // Solved (on the committed board, not mid-stroke): celebrate once.
  const solved = !stroke && evaluation.complete;
  if (solved && !won) {
    setWon(true);
    setShowWin(true);
    setCelebrateKey((k) => k + 1);
  }
  useEffect(() => {
    if (won) markComplete(level.id);
  }, [won, level.id, markComplete]);

  const meantDark = useMemo(() => cellsMeantDark(level), [level]);
  const engineBoard = useMemo(() => toEngineBoard(board), [board]);
  const hint = pickHint(level.intro, engineBoard, result, evaluation, outOfWire, meantDark);
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
        else if (tile.spin) edit((s) => rotateAt(s, cell));
        else if (isLocked(b, cell)) shakeTile(cell);
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
  const trayKeys = PART_ORDER.filter((k) => (level.inventory[k] ?? 0) > 0);
  const next = levelAfter(level.id);
  const nextChapter =
    next && chapterOf(next.id) !== chapterOf(level.id) ? chapterOf(next.id) : null;
  const budget = level.wireBudget;

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <View style={styles.toolbar}>
        <ToolButton
          label="‹"
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
        />
        <Text style={styles.levelTitle} numberOfLines={1}>
          {levelNumber(level.id)} {level.title}
        </Text>
        <ToolButton
          label="Undo"
          disabled={history.past.length === 0}
          onPress={() => dispatch({ type: 'undo' })}
        />
        <ToolButton
          label="Reset"
          onPress={() => dispatch({ type: 'reset', board: createLevelBoard(level) })}
        />
      </View>

      <View style={[styles.hint, hint.tone !== 'info' && styles[hint.tone]]}>
        <Text style={styles.hintText}>{hint.text}</Text>
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
      </View>

      <View ref={canvasView} style={styles.canvasWrap} onLayout={measure}>
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

      {showWin && (
        <View style={styles.winCard}>
          <Text style={styles.winTitle}>Level solved! ⚡</Text>
          <View style={styles.winButtons}>
            <ToolButton label="Keep playing" onPress={() => setShowWin(false)} />
            {next ? (
              <ToolButton
                label={
                  nextChapter
                    ? `Chapter ${nextChapter.id}: ${nextChapter.title} ›`
                    : `Next: ${next.title} ›`
                }
                primary
                onPress={() => router.replace(`/level/${next.id}`)}
              />
            ) : (
              <ToolButton label="All levels ›" primary onPress={() => router.replace('/')} />
            )}
          </View>
        </View>
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
  onStart,
  onMove,
  onEnd,
  onCancel,
}: {
  size: number;
  tile: Tile;
  label: string;
  count: number;
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
      <View style={[styles.slot, count <= 0 && styles.slotEmpty]}>
        <TileIcon tile={tile} size={size} />
        <Text style={styles.slotLabel}>{label}</Text>
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
  levelTitle: { flex: 1, fontSize: 17, fontWeight: '900', color: COLORS.text },
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
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 18,
    backgroundColor: COLORS.card,
    minHeight: 56,
    justifyContent: 'center',
    ...shadow,
  },
  warning: { backgroundColor: '#ffe9e4' },
  success: { backgroundColor: '#e3f6ea' },
  info: {},
  hintText: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
  },
  goals: { marginHorizontal: 18, marginTop: 8, gap: 2 },
  goal: { fontSize: 13, fontWeight: '700', color: COLORS.textSoft },
  goalMet: { color: COLORS.success },
  goalLimit: { color: COLORS.danger },
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
  winTitle: { fontSize: 22, fontWeight: '900', color: COLORS.text },
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
