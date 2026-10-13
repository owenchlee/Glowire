// The puzzle board as pixel art on a workbench, lit like the town: copper glows where
// current flows, LEDs glow in their colour and light the bench around them, sparks run
// along the wires. Same props and picker as the old 3D board, so the puzzle screen
// works with either.

import type { RootState } from '@react-three/fiber';
import { type RefObject, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet } from 'react-native';
import { BufferAttribute, Color, type Mesh, type OrthographicCamera, type Texture } from 'three';

import type { BoardState } from '../board/board';
import { type Direction, type SimulationResult, type Tile } from '../engine';
import { currentSkin } from './skin';
import type { GhostPreview, ScenePicker } from './types';
import { currentLevel, perceivedGlow } from '../render/flow';
import { Canvas, useFrame } from '../render/r3f';
import { LED_PALETTE } from '../render/theme';
import { type Lighting, MAX_LIGHTS, createLighting, loadPixelTexture, worldMaterial } from '../world-view/pixels';
import { type Quad, type Sheet, quadGeometry } from '../world-view/quads';

const SHEET = require('../../assets/art/circuit.png');
const T = 16;

/** Where each sprite sits in assets/art/circuit.png (see scripts/circuit-art.mjs). */
const SPRITE = {
  wire: (mask: number) => [mask, 0] as const,
  battery: [0, 1] as const,
  led: { red: [1, 1], green: [2, 1], blue: [3, 1] } as const,
  burned: [4, 1] as const,
  resistor: { 100: [5, 1], 220: [6, 1], 470: [7, 1], 1000: [8, 1] } as Record<number, readonly [number, number]>,
  switchOpen: [9, 1] as const,
  switchClosed: [10, 1] as const,
  rivets: [11, 1] as const,
  spark: [12, 1] as const,
  hover: [13, 1] as const,
  bench: [
    [14, 1],
    [15, 1],
  ] as const,
  bush: (n: number) => [n % 4, 2] as const,
};

const rgb = (hex: string) => {
  const c = new Color(hex);
  return [c.r, c.g, c.b] as const;
};
const LED_TINT = {
  red: rgb(LED_PALETTE.red.halo),
  green: rgb(LED_PALETTE.green.halo),
  blue: rgb(LED_PALETTE.blue.halo),
};
const SHORT_TINT = rgb('#ff4b3e');

/** Light over the bench: soft lamplight, nudged toward the chosen workbench colour. */
function benchLight(cell: string): string {
  return '#' + new Color('#ddd6ea').lerp(new Color(cell), 0.35).getHexString();
}

interface Props {
  board: BoardState;
  result: SimulationResult;
  ghost: GhostPreview | null;
  draggingId: number | null;
  shake: { id: number; key: number };
  celebrateKey: number;
  celebrateCell: number;
  pickerRef: RefObject<ScenePicker | null>;
  onReady: () => void;
}

export function PixelBoard(props: Props) {
  const [sheet, setSheet] = useState<Texture | null>(null);
  useEffect(() => {
    let alive = true;
    loadPixelTexture(SHEET).then((t) => alive && setSheet(t));
    return () => {
      alive = false;
    };
  }, []);
  return (
    <Canvas style={StyleSheet.absoluteFill} orthographic camera={{ position: [0, 0, 100], zoom: 48, near: 0.1, far: 1000 }}>
      <color attach="background" args={['#1b1f3b']} />
      {sheet && <Bench {...props} sheet={sheet} />}
    </Canvas>
  );
}

function sheetOf(t: Texture): Sheet {
  const img = t.image as { width: number; height: number };
  return { width: img.width, height: img.height };
}

const sprite = ([col, row]: readonly [number, number]) => ({ sx: col * T, sy: row * T, sw: T, sh: T });

/** Which sprite a tile is drawn with, and how it glows. */
function look(tile: Tile, cell: number, result: SimulationResult, wireGlow?: readonly [number, number, number]) {
  const r = result.tiles[cell] ?? null;
  const flow = currentLevel(r?.current ?? 0);
  const short = r?.status === 'SHORT_CIRCUIT' || (result.shortCircuit && flow > 0.9);
  switch (tile.kind) {
    case 'wire':
      // Arms are stored unrotated; the sprite is chosen by the turned arm set instead.
      return { at: SPRITE.wire(turnArms(tile.arms, tile.rotation)), rot: 0, lit: flow ? 0.35 + 0.65 * flow : 0, tint: short ? SHORT_TINT : wireGlow };
    case 'block':
      return { at: SPRITE.bush(cell * 7), rot: 0, lit: 0 };
    case 'battery':
      return { at: SPRITE.battery, rot: tile.rotation, lit: flow ? 0.5 + 0.5 * flow : 0, tint: short ? SHORT_TINT : undefined };
    case 'resistor':
      return { at: SPRITE.resistor[tile.ohms] ?? SPRITE.resistor[220]!, rot: tile.rotation, lit: flow ? 0.5 * flow : 0 };
    case 'switch':
      return { at: tile.closed ? SPRITE.switchClosed : SPRITE.switchOpen, rot: tile.rotation, lit: flow ? 0.6 : 0 };
    case 'led': {
      if (r?.status === 'BURNED_OUT') return { at: SPRITE.burned, rot: tile.rotation, lit: 0 };
      return { at: SPRITE.led[tile.color], rot: tile.rotation, lit: perceivedGlow(r?.brightness ?? 0), tint: LED_TINT[tile.color] };
    }
  }
}

/** Turn an arm mask (N=1, E=2, S=4, W=8) clockwise by `r` quarter turns. */
function turnArms(arms: number, r: number): number {
  let out = 0;
  for (let d = 0; d < 4; d++) if (arms & (1 << d)) out |= 1 << ((d + r) % 4);
  return out;
}

function Bench({
  board,
  result,
  ghost,
  draggingId,
  shake,
  celebrateKey,
  celebrateCell,
  pickerRef,
  onReady,
  sheet,
}: Props & { sheet: Texture }) {
  // The workbench colour from the shop tints the light over the bench.
  const skin = currentSkin();
  const lighting = useMemo(() => createLighting(benchLight(skin.board.cellA)), [skin.board.cellA]);
  const wireGlow = useMemo(() => rgb(skin.wire.glow), [skin.wire.glow]);
  const material = useMemo(() => worldMaterial(sheet, lighting), [sheet, lighting]);
  const size = useMemo(() => sheetOf(sheet), [sheet]);
  const { width: bw, height: bh } = board;

  // The bench and everything on it, rebuilt whenever the board or the current changes.
  const shaking = shake.key > 0 ? shake.id : null;
  const geometry = useMemo(() => {
    const quads: Quad[] = [];
    for (let y = 0; y < bh; y++)
      for (let x = 0; x < bw; x++) quads.push({ x, y, z: 0, ...sprite(SPRITE.bench[(x + y) % 2]!) });
    board.cells.forEach((placed, cell) => {
      if (!placed || placed.id === draggingId || placed.id === shaking) return;
      quads.push(...tileQuads(placed.tile, cell, bw, result, wireGlow));
    });
    if (ghost) {
      const x = ghost.cell % bw;
      const y = Math.floor(ghost.cell / bw);
      quads.push({ x, y, z: 0.5, lit: 1, ...sprite(SPRITE.hover) });
      const l = look(ghost.tile, ghost.cell, result);
      quads.push({ x, y, z: 0.4, rot: l.rot, ...sprite(l.at) });
    }
    return quadGeometry(quads, size);
  }, [board, result, ghost, draggingId, shaking, bw, bh, size, wireGlow]);
  useEffect(() => () => geometry.dispose(), [geometry]);

  // Lit LEDs light up the bench in their colour.
  const lights = useMemo(() => {
    const out: { x: number; y: number; r: number; c: readonly [number, number, number]; i: number }[] = [];
    board.cells.forEach((placed, cell) => {
      const t = placed?.tile;
      const r = result.tiles[cell];
      if (t?.kind !== 'led' || !r || r.status === 'BURNED_OUT') return;
      const glow = perceivedGlow(r.brightness);
      if (glow > 0) out.push({ x: (cell % bw) + 0.5, y: -Math.floor(cell / bw) - 0.5, r: 1.2 + 2.2 * glow, c: LED_TINT[t.color], i: 0.6 + 0.8 * glow });
    });
    return out.slice(0, MAX_LIGHTS);
  }, [board, result, bw]);

  const camera = useRef({ zoom: 0, w: 0, h: 0 });
  useFrame((state) => {
    const view = fit(state, bw, bh, lighting, lights);
    const c = camera.current;
    if (c.zoom !== view.zoom || c.w !== view.w || c.h !== view.h) {
      camera.current = view;
      onReady();
    }
  });

  // Picking and projecting, for drawing wires, dragging parts, and value tags.
  useEffect(() => {
    pickerRef.current = {
      cellAt(px, py) {
        const { zoom, w, h } = camera.current;
        if (!zoom) return null;
        const x = Math.floor(bw / 2 + (px - w / 2) / zoom);
        const y = Math.floor(bh / 2 + (py - h / 2) / zoom);
        return x >= 0 && y >= 0 && x < bw && y < bh ? y * bw + x : null;
      },
      project(cell) {
        const { zoom, w, h } = camera.current;
        const x = (cell % bw) + 0.5 - bw / 2;
        const y = Math.floor(cell / bw) + 0.2 - bh / 2;
        return { x: w / 2 + x * zoom, y: h / 2 + y * zoom };
      },
    };
  }, [pickerRef, bw, bh]);

  return (
    <>
      <mesh geometry={geometry} material={material} />
      <Sparks board={board} result={result} material={material} sheet={size} />
      {shaking !== null && <Shaking key={shake.key} board={board} result={result} id={shaking} material={material} sheet={size} />}
      {celebrateKey > 0 && <Burst key={celebrateKey} cell={celebrateCell} bw={bw} material={material} sheet={size} />}
    </>
  );
}

function tileQuads(
  tile: Tile,
  cell: number,
  bw: number,
  result: SimulationResult,
  wireGlow?: readonly [number, number, number],
): Quad[] {
  const x = cell % bw;
  const y = Math.floor(cell / bw);
  const l = look(tile, cell, result, wireGlow);
  const quads: Quad[] = [{ x, y, z: 0.2, rot: l.rot, lit: l.lit, tint: l.tint, ...sprite(l.at) }];
  if (tile.locked && tile.kind !== 'block' && !tile.spin) quads.push({ x, y, z: 0.25, ...sprite(SPRITE.rivets) });
  return quads;
}

/** Fit the board on screen at a whole number of screen pixels per art pixel, and update lights. */
function fit(
  state: RootState,
  bw: number,
  bh: number,
  lighting: Lighting,
  lights: { x: number; y: number; r: number; c: readonly [number, number, number]; i: number }[],
) {
  const camera = state.camera as OrthographicCamera;
  const { size } = state;
  const dpr = state.viewport.dpr;
  const fitCells = Math.min((size.width * dpr) / (bw + 0.5), (size.height * dpr) / (bh + 0.9));
  const devicePerCell = Math.max(T, Math.floor(fitCells / T) * T);
  const zoom = devicePerCell / dpr;
  if (camera.zoom !== zoom) {
    camera.zoom = zoom;
    camera.updateProjectionMatrix();
  }
  // Centre the board (snapped so art pixels land on screen pixels).
  const snap = (v: number) => Math.round(v * devicePerCell) / devicePerCell;
  camera.position.x = snap(bw / 2);
  camera.position.y = -snap(bh / 2);

  lighting.uTime.value = state.clock.elapsedTime;
  const u = lighting.uLights.value;
  const uc = lighting.uLightColors.value;
  lights.forEach((l, i) => {
    u[i]!.set(l.x, l.y, l.r, l.i);
    uc[i]!.set(l.c[0], l.c[1], l.c[2]);
  });
  lighting.uLightCount.value = lights.length;
  return { zoom, w: size.width, h: size.height };
}

const DIR: Record<Direction, readonly [number, number]> = { 0: [0, -1], 1: [1, 0], 2: [0, 1], 3: [-1, 0] };

/**
 * Little sparks running along the copper in the direction of conventional current: from
 * the edge to the middle of a tile where current flows in, and out again where it leaves.
 */
function Sparks({ board, result, material, sheet }: { board: BoardState; result: SimulationResult; material: ReturnType<typeof worldMaterial>; sheet: Sheet }) {
  const arms = useMemo(() => {
    const list: { sx: number; sy: number; ex: number; ey: number; speed: number; count: number; short: boolean }[] = [];
    result.tiles.forEach((t, cell) => {
      if (!t) return;
      const cx = (cell % board.width) + 0.5;
      const cy = Math.floor(cell / board.width) + 0.5;
      for (const [key, I] of Object.entries(t.portCurrents)) {
        const level = currentLevel(I ?? 0);
        if (!level) continue;
        const [vx, vy] = DIR[Number(key) as Direction];
        const edge = [cx + vx * 0.5, cy + vy * 0.5] as const;
        const inward = (I ?? 0) > 0;
        list.push({
          sx: inward ? edge[0] : cx,
          sy: inward ? edge[1] : cy,
          ex: inward ? cx : edge[0],
          ey: inward ? cy : edge[1],
          speed: 0.6 + 2 * level,
          count: 1 + Math.floor(level * 1.99),
          short: t.status === 'SHORT_CIRCUIT' || result.shortCircuit,
        });
      }
    });
    return list;
  }, [board, result]);

  const total = arms.reduce((s, a) => s + a.count, 0);
  const geometry = useMemo(
    () =>
      quadGeometry(
        arms.flatMap((a) =>
          Array.from({ length: a.count }, () => ({ x: 0, y: 0, z: 0.6, lit: 1, tint: a.short ? SHORT_TINT : undefined, ...sprite(SPRITE.spark) })),
        ),
        sheet,
      ),
    [arms, sheet],
  );
  useEffect(() => () => geometry.dispose(), [geometry]);

  const ref = useRef<Mesh>(null);
  useFrame(({ clock }) => {
    const pos = ref.current?.geometry.getAttribute('position') as BufferAttribute | undefined;
    if (!pos) return;
    let q = 0;
    const s = 0.5; // a spark quad is half a cell, the dot sits in its middle
    for (const a of arms)
      for (let k = 0; k < a.count; k++) {
        const t = (clock.elapsedTime * a.speed + k / a.count) % 1;
        // Snap to art pixels so sparks move like pixel art, not smoothly.
        const x = Math.round((a.sx + (a.ex - a.sx) * t - s / 2) * 16) / 16;
        const y = Math.round((a.sy + (a.ey - a.sy) * t - s / 2) * 16) / 16;
        pos.array.set([x, -y, 0.6, x + s, -y, 0.6, x + s, -y - s, 0.6, x, -y - s, 0.6], q * 12);
        q++;
      }
    pos.needsUpdate = true;
  });
  if (!total) return null;
  return <mesh ref={ref} geometry={geometry} material={material} />;
}

/** A tile that was just tapped or bumped wobbles for a moment. */
function Shaking({ board, result, id, material, sheet }: { board: BoardState; result: SimulationResult; id: number; material: ReturnType<typeof worldMaterial>; sheet: Sheet }) {
  const cell = board.cells.findIndex((p) => p?.id === id);
  const tile = board.cells[cell]?.tile;
  const geometry = useMemo(() => (tile ? quadGeometry(tileQuads(tile, cell, board.width, result), sheet) : null), [tile, cell, board.width, result, sheet]);
  useEffect(() => () => geometry?.dispose(), [geometry]);
  const ref = useRef<Mesh>(null);
  const start = useRef(-1);
  useFrame(({ clock }) => {
    if (start.current < 0) start.current = clock.elapsedTime;
    const t = clock.elapsedTime - start.current;
    if (ref.current) ref.current.position.x = t < 0.35 ? Math.round(Math.sin(t * 60) * (0.35 - t) * 0.3 * 16) / 16 : 0;
  });
  if (!geometry) return null;
  return <mesh ref={ref} geometry={geometry} material={material} />;
}

const CONFETTI = ['#ff8fa3', '#ffd56b', '#8fd6b4', '#9db8ff', '#c9a7ff', '#ffb27a'].map(rgb);

/** Sparks bursting out of an LED the first time it lights. */
function Burst({ cell, bw, material, sheet }: { cell: number; bw: number; material: ReturnType<typeof worldMaterial>; sheet: Sheet }) {
  const bits = useMemo(
    () =>
      Array.from({ length: 16 }, (_, i) => ({
        angle: (i / 16) * Math.PI * 2,
        speed: 1.4 + ((i * 7) % 5) * 0.25,
      })),
    [],
  );
  const geometry = useMemo(
    () => quadGeometry(bits.map((_, i) => ({ x: 0, y: 0, z: 0.8, lit: 1, tint: CONFETTI[i % CONFETTI.length], ...sprite(SPRITE.spark) })), sheet),
    [bits, sheet],
  );
  useEffect(() => () => geometry.dispose(), [geometry]);
  const ref = useRef<Mesh>(null);
  const start = useRef(-1);
  const cx = (cell % bw) + 0.5;
  const cy = Math.floor(cell / bw) + 0.5;
  useFrame(({ clock }) => {
    if (start.current < 0) start.current = clock.elapsedTime;
    const t = clock.elapsedTime - start.current;
    const mesh = ref.current;
    if (!mesh) return;
    mesh.visible = t < 1.2;
    const pos = mesh.geometry.getAttribute('position') as BufferAttribute;
    const s = 0.5;
    bits.forEach((b, i) => {
      const r = b.speed * t * (1 - t * 0.35);
      const x = Math.round((cx + Math.cos(b.angle) * r - s / 2) * 16) / 16;
      const y = Math.round((cy + Math.sin(b.angle) * r - s / 2 + t * t * 0.8) * 16) / 16;
      pos.array.set([x, -y, 0.8, x + s, -y, 0.8, x + s, -y - s, 0.8, x, -y - s, 0.8], i * 12);
    });
    pos.needsUpdate = true;
  });
  return <mesh ref={ref} geometry={geometry} material={material} />;
}

