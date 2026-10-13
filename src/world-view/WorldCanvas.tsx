// Draws a world: the tile map, everyone standing in it, and the hero, lit for night.
// Game state lives in refs owned by the screen; this only reads it every frame.

import { type RefObject, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet } from 'react-native';
import type { RootState } from '@react-three/fiber';
import { type BufferGeometry, Color, type Mesh, type OrthographicCamera, type ShaderMaterial, type Texture } from 'three';

import { EXTRAS, PEOPLE } from '../world/people.generated';
import type { Resident, WorldMap } from '../world/types';
import { type Walker, walkFrame, walkerPosition } from '../world/walker';
import { Canvas, useFrame } from '../render/r3f';
import { type Lighting, MAX_LIGHTS, createFog, createLighting, loadPixelTexture, worldMaterial } from './pixels';
import { type Quad, type Sheet, quadGeometry, setQuadSource } from './quads';

const WORLD_SHEET = require('../../assets/art/world.png');
const PEOPLE_SHEET = require('../../assets/art/people.png');

const T = 16;
const FACING_COLUMN = { down: 0, up: 1, left: 2, right: 3 } as const;

/** Where the camera is, so taps on the screen can be turned into map cells. */
export interface View {
  /** Camera centre in map cells. */
  x: number;
  y: number;
  /** Screen pixels per cell. */
  zoom: number;
  width: number;
  height: number;
}

interface Props {
  map: WorldMap;
  /** Stop drawing while another screen (a puzzle, the shop) is on top. */
  paused?: boolean;
  lit: Set<string>;
  /** Darkness per cell over the route not reached yet (0–255); fades when it changes. */
  fog: Uint8Array;
  residents: Resident[];
  /** Residents with a speech bubble over their head. */
  bubbles: { who: string; x: number; y: number; kind: (typeof EXTRAS)[number] }[];
  walker: RefObject<Walker>;
  /** The hero's sprite (an outfit). */
  hero?: string;
  /** The pet trotting along behind the hero, if one is equipped. */
  pet?: string | null;
  onTick: (dt: number) => void;
  /** Told where the camera is each frame. */
  onView: (view: View) => void;
}

export function WorldCanvas(props: Props) {
  const [sheets, setSheets] = useState<{ city: Texture; people: Texture } | null>(null);
  useEffect(() => {
    let alive = true;
    Promise.all([loadPixelTexture(WORLD_SHEET), loadPixelTexture(PEOPLE_SHEET)]).then(([city, people]) => {
      if (alive) setSheets({ city, people });
    });
    return () => {
      alive = false;
    };
  }, []);

  return (
    <Canvas
      style={StyleSheet.absoluteFill}
      frameloop={props.paused ? 'never' : 'always'}
      orthographic
      camera={{ position: [0, 0, 100], zoom: 48, near: 0.1, far: 1000 }}
    >
      <color attach="background" args={['#0d0f1e']} />
      {sheets && <Scene {...props} sheets={sheets} />}
    </Canvas>
  );
}

function sheetOf(t: Texture): Sheet {
  const img = t.image as { width: number; height: number };
  return { width: img.width, height: img.height };
}

function Scene({
  map,
  lit,
  residents,
  bubbles,
  walker,
  onTick,
  onView,
  sheets,
  pet,
  fog,
  hero = 'hero',
}: Props & { sheets: { city: Texture; people: Texture } }) {
  const fogTexture = useMemo(() => createFog(map.width, map.height), [map]);
  const lighting = useMemo(() => createLighting('#6a74ad', fogTexture), [fogTexture]);
  // The fog drifts toward its new shape instead of snapping, so a newly opened stretch of
  // road brightens in front of you. It starts out already in place.
  const fogNow = useRef<Float32Array | null>(null);
  useEffect(() => () => fogTexture.dispose(), [fogTexture]);
  const city = useMemo(() => worldMaterial(sheets.city, lighting), [sheets.city, lighting]);
  const people = useMemo(() => worldMaterial(sheets.people, lighting, 1), [sheets.people, lighting]);
  const citySheet = useMemo(() => sheetOf(sheets.city), [sheets.city]);
  const peopleSheet = useMemo(() => sheetOf(sheets.people), [sheets.people]);
  const cols = citySheet.width / T;

  const tile = (index: number, x: number, y: number, z: number, isLit = 0): Quad => ({
    x,
    y,
    sx: (index % cols) * T,
    sy: Math.floor(index / cols) * T,
    sw: T,
    sh: T,
    z,
    lit: isLit,
  });

  // The ground never changes.
  const ground = useMemo(() => {
    const quads: Quad[] = [];
    for (let y = 0; y < map.height; y++)
      for (let x = 0; x < map.width; x++) {
        const g = map.ground[y * map.width + x]!;
        const d = map.decal[y * map.width + x]!;
        if (g >= 0) quads.push(tile(g, x, y, 0));
        if (d >= 0) quads.push(tile(d, x, y, 0.01));
      }
    return quadGeometry(quads, citySheet);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, citySheet]);

  // Buildings, lamps and trees: rebuilt when something lights up.
  const litKey = [...lit].sort().join('|');
  const objects = useMemo(() => {
    const quads: Quad[] = [];
    for (const o of map.objects) {
      if (o.until && lit.has(o.until)) continue;
      const z = o.flat ? 0.02 : depth(o.y + o.h);
      const on = o.group && lit.has(o.group) ? 1 : 0;
      o.tiles.forEach((t, i) => {
        if (t >= 0) quads.push(tile(t, o.x + (i % o.w), o.y + Math.floor(i / o.w), z, on));
      });
    }
    return quadGeometry(quads, citySheet);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, citySheet, litKey]);

  useEffect(() => () => ground.dispose(), [ground]);
  useEffect(() => () => objects.dispose(), [objects]);

  // Lights that are on, as plain numbers for the per-frame pick.
  const lights = useMemo(
    () =>
      map.lights
        .filter((l) => lit.has(l.group))
        .map((l) => {
          const c = new Color(l.color);
          return { x: l.x, y: -l.y, r: l.radius, color: [c.r * 1.25, c.g * 1.25, c.b * 1.25] as const } as Lit;
        }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [map, litKey],
  );

  useFrame((state, delta) => {
    onTick(Math.min(delta, 0.05));
    driftFog(fogNow, fog, fogTexture, delta);
    onView(frame(state, walkerPosition(walker.current), map, lights, lighting));
  });

  return (
    <>
      <mesh geometry={ground} material={city} />
      <mesh geometry={objects} material={city} />
      {residents.map((r) => (
        <Person key={`${r.who}@${r.x},${r.y}`} who={r.who} x={r.x} y={r.y} facing={r.facing} sheet={peopleSheet} material={people} />
      ))}
      <Hero key={hero} who={hero} walker={walker} sheet={peopleSheet} material={people} />
      {pet && <Pet key={pet} id={pet} walker={walker} sheet={peopleSheet} material={people} />}
      {bubbles.map((b) => (
        <Bubble key={`${b.who}@${b.x},${b.y}`} {...b} sheet={peopleSheet} material={people} />
      ))}
    </>
  );
}

/** Move the fog a step toward its target, uploading it only while it's changing. */
function driftFog(now: { current: Float32Array | null }, target: Uint8Array, texture: ReturnType<typeof createFog>, dt: number) {
  const data = (texture.image as { data: Uint8Array }).data;
  if (!now.current || now.current.length !== target.length) {
    now.current = Float32Array.from(target);
    data.set(target);
    texture.needsUpdate = true;
    return;
  }
  const cur = now.current;
  let moved = false;
  const step = dt * 170; // about 1.5 s from black to clear
  for (let i = 0; i < cur.length; i++) {
    const t = target[i]!;
    const c = cur[i]!;
    if (c === t) continue;
    cur[i] = c < t ? Math.min(t, c + step) : Math.max(t, c - step);
    data[i] = Math.round(cur[i]!);
    moved = true;
  }
  if (moved) texture.needsUpdate = true;
}

type Lit = { x: number; y: number; r: number; color: readonly [number, number, number] };

/**
 * Per frame: zoom and follow the hero with the camera, and hand the shader the lights near
 * the camera (plus a little lantern glow around the hero). Returns where the camera is.
 */
function frame(
  state: RootState,
  hero: { x: number; y: number },
  map: WorldMap,
  lights: Lit[],
  lighting: Lighting,
): View {
  const camera = state.camera as OrthographicCamera;
  const { size } = state;
  const dpr = state.viewport.dpr;
  lighting.uTime.value = state.clock.elapsedTime;

  // About 11½ cells top to bottom, at a whole number of screen pixels per art pixel, so the
  // pixel art stays crisp.
  const devicePerCell = Math.max(32, Math.round((size.height * dpr) / 11.5 / T) * T);
  const zoom = devicePerCell / dpr;
  if (camera.zoom !== zoom) {
    camera.zoom = zoom;
    camera.updateProjectionMatrix();
  }

  // Follow the hero without showing past the edges of the map.
  const halfW = size.width / zoom / 2;
  const halfH = size.height / zoom / 2;
  const clamp = (v: number, lo: number, hi: number) => (lo > hi ? (lo + hi) / 2 : Math.min(hi, Math.max(lo, v)));
  const cx = clamp(hero.x + 0.5, halfW, map.width - halfW);
  const cy = clamp(hero.y + 0.5, halfH, map.height - halfH);
  const snap = (v: number) => Math.round(v * devicePerCell) / devicePerCell;
  camera.position.x = snap(cx);
  camera.position.y = -snap(cy);

  const near = lights
    .map((l) => ({ l, d: Math.abs(l.x - cx) + Math.abs(-l.y - cy) }))
    .filter((e) => e.d < halfW + halfH + 6)
    .sort((a, b) => a.d - b.d)
    .slice(0, MAX_LIGHTS - 1);
  const u = lighting.uLights.value;
  const uc = lighting.uLightColors.value;
  u[0]!.set(hero.x + 0.5, -hero.y - 0.4, 2.8, 1);
  uc[0]!.set(0.32, 0.36, 0.48);
  near.forEach(({ l }, i) => {
    u[i + 1]!.set(l.x, l.y, l.r, 1);
    uc[i + 1]!.set(l.color[0], l.color[1], l.color[2]);
  });
  lighting.uLightCount.value = near.length + 1;
  return { x: cx, y: cy, zoom, width: size.width, height: size.height };
}

/** Depth for something whose feet are on row `feet`: further down the map is in front. */
const depth = (feet: number) => 1 + feet * 0.01;

function useQuad(sheet: Sheet, sx: number, sy: number, sw: number, sh: number, w = 1, h = 1): BufferGeometry {
  const g = useMemo(
    () => quadGeometry([{ x: 0, y: 0, w, h, sx, sy, sw, sh, z: 0 }], sheet),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sheet],
  );
  useEffect(() => () => g.dispose(), [g]);
  return g;
}

/** A soft shadow under someone's feet. */
function Shadow({ sheet, material }: { sheet: Sheet; material: ShaderMaterial }) {
  const g = useQuad(sheet, 0, 112 + 4, 16, 12, 1, 0.75);
  return <mesh geometry={g} material={material} position={[0, -0.3, -0.003]} />;
}

function Person({
  who,
  x,
  y,
  facing,
  sheet,
  material,
}: {
  who: string;
  x: number;
  y: number;
  facing: Resident['facing'];
  sheet: Sheet;
  material: ShaderMaterial;
}) {
  const column = Math.max(0, PEOPLE.indexOf(who as (typeof PEOPLE)[number]));
  const g = useQuad(sheet, column * 64 + FACING_COLUMN[facing] * T, 0, T, T);
  // A gentle idle bob, so the town feels alive.
  const ref = useRef<Mesh>(null);
  const phase = useMemo(() => (x * 7 + y * 13) % 10, [x, y]);
  useFrame(({ clock }) => {
    if (ref.current) ref.current.position.y = Math.sin(clock.elapsedTime * 2.2 + phase) > 0.6 ? 1 / 16 : 0;
  });
  return (
    <group position={[x, -y, depth(y + 1)]}>
      <Shadow sheet={sheet} material={material} />
      <mesh ref={ref} geometry={g} material={material} />
    </group>
  );
}

function Hero({ who, walker, sheet, material }: { who: string; walker: RefObject<Walker>; sheet: Sheet; material: ShaderMaterial }) {
  const column = Math.max(0, PEOPLE.indexOf(who as (typeof PEOPLE)[number])) * 64;
  const g = useQuad(sheet, column, 0, T, T);
  const group = useRef<Mesh>(null);
  const last = useRef('');
  useFrame(() => {
    const w = walker.current;
    const p = walkerPosition(w);
    const frame = walkFrame(w);
    const key = `${w.facing}${frame}`;
    if (key !== last.current) {
      last.current = key;
      setQuadSource(g, sheet, column + FACING_COLUMN[w.facing] * T, frame * T, T, T);
    }
    if (group.current) group.current.position.set(p.x, -p.y, depth(p.y + 1) + 0.005);
  });
  return (
    <group ref={group}>
      <Shadow sheet={sheet} material={material} />
      <mesh geometry={g} material={material} />
    </group>
  );
}

/**
 * A pet follows the hero's footsteps about one cell behind, hopping between its two frames
 * while it moves and facing the way it's going.
 */
function Pet({ id, walker, sheet, material }: { id: string; walker: RefObject<Walker>; sheet: Sheet; material: ShaderMaterial }) {
  const column = Math.max(0, PEOPLE.indexOf(id as (typeof PEOPLE)[number]));
  const g = useQuad(sheet, column * 64, 0, T, T);
  const ref = useRef<Mesh>(null);
  const trail = useRef<{ x: number; y: number }[]>([]);
  const state = useRef({ frame: -1, left: false, clock: 0 });
  useFrame((_, delta) => {
    const hero = walkerPosition(walker.current);
    const t = trail.current;
    const last = t[t.length - 1];
    if (!last || Math.hypot(last.x - hero.x, last.y - hero.y) > 0.05) t.push({ ...hero });
    if (t.length > 60) t.splice(0, t.length - 60);
    // Walk back along the trail about one cell from the hero.
    let need = 0.95;
    let at = hero;
    for (let i = t.length - 1; i >= 0 && need > 0; i--) {
      const p = t[i]!;
      const d = Math.hypot(p.x - at.x, p.y - at.y);
      if (d >= need) {
        at = { x: at.x + ((p.x - at.x) * need) / d, y: at.y + ((p.y - at.y) * need) / d };
        need = 0;
      } else {
        need -= d;
        at = p;
      }
    }
    const s = state.current;
    const mesh = ref.current;
    if (!mesh) return;
    const moving = Math.abs(mesh.position.x - at.x) + Math.abs(-mesh.position.y - at.y) > 0.001;
    if (at.x < mesh.position.x - 0.001) s.left = true;
    else if (at.x > mesh.position.x + 0.001) s.left = false;
    s.clock = moving ? s.clock + delta : 0;
    const frame = moving ? Math.floor(s.clock * 8) % 2 : 0;
    const key = frame + (s.left ? 2 : 0);
    if (key !== s.frame) {
      s.frame = key;
      setQuadSource(g, sheet, column * 64 + frame * T, 0, T, T, s.left);
    }
    mesh.position.set(at.x, -at.y, depth(at.y + 1) + 0.002);
  });
  return <mesh ref={ref} geometry={g} material={material} />;
}

function Bubble({
  x,
  y,
  kind,
  sheet,
  material,
}: {
  x: number;
  y: number;
  kind: (typeof EXTRAS)[number];
  sheet: Sheet;
  material: ShaderMaterial;
}) {
  const g = useQuad(sheet, EXTRAS.indexOf(kind) * T, 112, T, T, 0.9, 0.9);
  const ref = useRef<Mesh>(null);
  useFrame(({ clock }) => {
    const bob = Math.round(Math.abs(Math.sin(clock.elapsedTime * 3)) * 3) / 16;
    if (ref.current) ref.current.position.set(x + 0.3, -y + 0.95 + bob, 3);
  });
  return <mesh ref={ref} geometry={g} material={material} />;
}
