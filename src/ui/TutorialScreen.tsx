import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  type BoardState,
  canEdit,
  isEmpty,
  isLocked,
  moveTile,
  placeTile,
  removeAt,
  rotateAt,
  toEngineBoard,
} from '../board/board';
import { TUTORIAL_TRAY, type TrayItem, createTutorialBoard } from '../board/tutorial';
import { type Tile, simulate } from '../engine';
import { BoardCanvas, type GhostPreview, type ScenePicker } from '../render/BoardScene';
import { COLORS, formatCurrent, formatOhms } from '../render/theme';
import { pickHint } from './hints';
import { TileIcon } from './TileIcon';

type Drag =
  { source: 'tray'; tile: Tile } | { source: 'board'; tile: Tile; from: number; id: number };

type Hover = { kind: 'cell'; cell: number } | { kind: 'trash' } | { kind: 'off' } | null;

/** The dragged tile floats this far above the finger so the finger doesn't hide it. */
const LIFT = 56;
const ICON = 52;

export function TutorialScreen() {
  const [board, setBoard] = useState<BoardState>(createTutorialBoard);
  // Re-solve the circuit after every change. A 5×5 board solves in well under 1 ms.
  const result = useMemo(() => simulate(toEngineBoard(board)), [board]);

  const [drag, setDrag] = useState<Drag | null>(null);
  const [hover, setHover] = useState<Hover>(null);
  const [shake, setShake] = useState({ id: 0, key: 0 });
  const [hasLit, setHasLit] = useState(false);
  const [celebrateKey, setCelebrateKey] = useState(0);
  const [sceneVersion, setSceneVersion] = useState(0);

  const picker = useRef<ScenePicker | null>(null);
  const canvasOrigin = useRef({ x: 0, y: 0 });
  const canvasView = useRef<View>(null);
  const trayTop = useRef(Infinity);
  const trayView = useRef<View>(null);
  const [dragPos] = useState(() => new Animated.ValueXY());

  // Gesture callbacks are created once, so they read the latest state through refs.
  const live = useRef({ board, drag, hover });
  useLayoutEffect(() => {
    live.current = { board, drag, hover };
  });

  const anyLit = result.tiles.some((t) => t?.kind === 'led' && t.status === 'OK');
  // First time the LED lights: celebrate. (Adjusting state during render is React's
  // recommended alternative to an effect for "react to a change in derived data".)
  if (anyLit && !hasLit) {
    setHasLit(true);
    setCelebrateKey((k) => k + 1);
  }

  const hint = pickHint(result, hasLit);
  const onSceneReady = useCallback(() => setSceneVersion((v) => v + 1), []);

  const measure = useCallback(() => {
    canvasView.current?.measureInWindow((x, y) => (canvasOrigin.current = { x, y }));
    trayView.current?.measureInWindow((_x, y) => (trayTop.current = y));
  }, []);

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
        setBoard((b) => {
          if (d.source === 'tray') {
            return h?.kind === 'cell' ? placeTile(b, h.cell, d.tile) : b;
          }
          if (h?.kind === 'cell') return h.cell === d.from ? b : moveTile(b, d.from, h.cell);
          return removeAt(b, d.from); // dropped on the trash or off the board
        });
      }
      setDrag(null);
      setHover(null);
    },
    [hoverAt],
  );

  const cancelDrag = useCallback(() => {
    setDrag(null);
    setHover(null);
  }, []);

  const shakeTile = useCallback((cell: number) => {
    const id = live.current.board.cells[cell]?.id;
    if (id) setShake((s) => ({ id, key: s.key + 1 }));
  }, []);

  // Board: tap to rotate, drag to move or remove. Locked tiles just shake.
  const boardGesture = useMemo(() => {
    const tap = Gesture.Tap()
      .runOnJS(true)
      .maxDistance(10)
      .onEnd((e, success) => {
        if (!success) return;
        const cell = picker.current?.cellAt(e.x, e.y);
        if (cell == null || !live.current.board.cells[cell]) return;
        if (isLocked(live.current.board, cell)) shakeTile(cell);
        else setBoard((b) => rotateAt(b, cell));
      });
    let start = { x: 0, y: 0 };
    let active = false;
    const pan = Gesture.Pan()
      .runOnJS(true)
      .minDistance(8)
      .onBegin((e) => (start = { x: e.x, y: e.y }))
      .onStart((e) => {
        const b = live.current.board;
        const cell = picker.current?.cellAt(start.x, start.y);
        active = false;
        if (cell == null || !b.cells[cell]) return;
        if (!canEdit(b, cell)) return shakeTile(cell);
        const placed = b.cells[cell]!;
        active = true;
        startDrag(
          { source: 'board', tile: placed.tile, from: cell, id: placed.id },
          e.absoluteX,
          e.absoluteY,
        );
      })
      .onUpdate((e) => active && moveDrag(e.absoluteX, e.absoluteY))
      .onEnd((e) => active && endDrag(e.absoluteX, e.absoluteY))
      .onFinalize(() => {
        if (active) cancelDrag();
        active = false;
      });
    return Gesture.Exclusive(pan, tap);
  }, [cancelDrag, endDrag, moveDrag, shakeTile, startDrag]);

  const ghost: GhostPreview | null =
    drag && hover?.kind === 'cell' && isEmpty(board, hover.cell)
      ? { cell: hover.cell, tile: drag.tile }
      : null;
  const draggingId = drag?.source === 'board' ? drag.id : null;
  const showFloating = drag && !ghost && !(drag.source === 'board' && hover?.kind === 'cell');

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <View style={[styles.hint, hint.tone !== 'info' && styles[hint.tone]]}>
        <Text style={styles.hintText}>{hint.text}</Text>
      </View>

      <View ref={canvasView} style={styles.canvasWrap} onLayout={measure}>
        <BoardCanvas
          board={board}
          result={result}
          ghost={ghost}
          draggingId={draggingId}
          shake={shake}
          celebrateKey={celebrateKey}
          pickerRef={picker}
          onReady={onSceneReady}
        />
        <Labels
          board={board}
          result={result}
          picker={picker}
          hiddenId={draggingId}
          version={sceneVersion}
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
        ) : (
          <View style={styles.tray}>
            {TUTORIAL_TRAY.map((item) => (
              <TraySlot
                key={item.key}
                item={item}
                onStart={startDrag}
                onMove={moveDrag}
                onEnd={endDrag}
                onCancel={cancelDrag}
              />
            ))}
          </View>
        )}
      </View>

      {showFloating && (
        <Animated.View
          pointerEvents="none"
          style={[styles.floating, { transform: dragPos.getTranslateTransform() }]}
        >
          <TileIcon tile={drag.tile} size={ICON} />
        </Animated.View>
      )}
    </SafeAreaView>
  );
}

function TraySlot({
  item,
  onStart,
  onMove,
  onEnd,
  onCancel,
}: {
  item: TrayItem;
  onStart: (d: Drag, x: number, y: number) => void;
  onMove: (x: number, y: number) => void;
  onEnd: (x: number, y: number) => void;
  onCancel: () => void;
}) {
  const gesture = useMemo(() => {
    let ended = false;
    return Gesture.Pan()
      .runOnJS(true)
      .minDistance(2)
      .onStart((e) => {
        ended = false;
        onStart({ source: 'tray', tile: item.tile }, e.absoluteX, e.absoluteY);
      })
      .onUpdate((e) => onMove(e.absoluteX, e.absoluteY))
      .onEnd((e) => {
        ended = true;
        onEnd(e.absoluteX, e.absoluteY);
      })
      .onFinalize(() => {
        if (!ended) onCancel();
      });
  }, [item.tile, onStart, onMove, onEnd, onCancel]);

  return (
    <GestureDetector gesture={gesture}>
      <View style={styles.slot}>
        <TileIcon tile={item.tile} size={ICON} />
        <Text style={styles.slotLabel}>{item.label}</Text>
      </View>
    </GestureDetector>
  );
}

/** Friendly value tags floating over parts: "220 Ω", "3 V", and LED current. */
function Labels({
  board,
  result,
  picker,
  hiddenId,
  version,
}: {
  board: BoardState;
  result: ReturnType<typeof simulate>;
  picker: React.RefObject<ScenePicker | null>;
  hiddenId: number | null;
  version: number;
}) {
  if (!picker.current || version === 0) return null;
  const tags: { key: number; x: number; y: number; text: string; tone?: 'led' }[] = [];
  board.cells.forEach((placed, cell) => {
    if (!placed || placed.id === hiddenId) return;
    const t = placed.tile;
    const r = result.tiles[cell];
    let text: string | null = null;
    let tone: 'led' | undefined;
    if (t.kind === 'resistor') text = formatOhms(t.ohms);
    else if (t.kind === 'battery') text = `${t.volts} V`;
    else if (t.kind === 'led' && r && r.current > 1e-4 && r.status !== 'BURNED_OUT') {
      text = formatCurrent(r.current);
      tone = 'led';
    }
    if (!text) return;
    const p = picker.current!.project(cell, t.kind === 'led' ? 1.1 : 0.85);
    tags.push({ key: placed.id, x: p.x, y: p.y, text, tone });
  });
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {tags.map((tag) => (
        <View
          key={tag.key}
          style={[
            styles.tag,
            tag.tone === 'led' && styles.tagLed,
            { left: tag.x - 32, top: tag.y - 11 },
          ]}
        >
          <Text style={[styles.tagText, tag.tone === 'led' && styles.tagLedText]}>{tag.text}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },
  hint: {
    marginHorizontal: 16,
    marginTop: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: COLORS.card,
    shadowColor: '#6e5f8a',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    minHeight: 64,
    justifyContent: 'center',
  },
  warning: { backgroundColor: '#ffe9e4' },
  success: { backgroundColor: '#e3f6ea' },
  info: {},
  hintText: {
    fontSize: 17,
    lineHeight: 23,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
  },
  canvasWrap: { flex: 1 },
  trayWrap: { paddingHorizontal: 12, paddingBottom: 8, minHeight: 104 },
  tray: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: COLORS.card,
    borderRadius: 24,
    paddingVertical: 12,
    paddingHorizontal: 10,
    shadowColor: '#6e5f8a',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: -2 },
  },
  slot: { alignItems: 'center', gap: 6 },
  slotLabel: { fontSize: 12, fontWeight: '700', color: COLORS.textSoft },
  trash: {
    height: 96,
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
    width: 64,
    paddingVertical: 2,
    borderRadius: 10,
    backgroundColor: 'rgba(255,250,244,0.92)',
    alignItems: 'center',
  },
  tagText: { fontSize: 12, fontWeight: '800', color: COLORS.text },
  tagLed: { backgroundColor: 'rgba(255,90,95,0.92)' },
  tagLedText: { color: '#fff' },
});
