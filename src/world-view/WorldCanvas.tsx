// Draws a world: the tile map, everyone standing in it, and the hero, lit for night.
// Game state lives in refs owned by the screen; this only reads it every frame.

import { type RefObject, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet } from 'react-native';
import type { RootState } from '@react-three/fiber';
import { type BufferGeometry, Color, type Group, type Mesh, type OrthographicCamera, type ShaderMaterial, type Texture } from 'three';

import { FILLED_TILE, ROCK_TILE } from '../world/builder';
import { EXTRAS, PEOPLE } from '../world/people.generated';
import type { RockState } from '../world/rocks';
import type { Resident, WorldMap } from '../world/types';
import { type Walker, walkFrame, walkerPosition } from '../world/walker';
import { Canvas, useFrame } from '../render/r3f';
import type { Placed } from '../world/routines';
import { AMBIENT, Ambient, Dust } from './Ambient';
import { ambientColor, currentPhase, daylight } from './daylight';
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
  /** Secrets not found yet: a little twinkle over each. */
  sparkles?: { x: number; y: number }[];
  /** Pushable rocks, and the water they've filled (world/rocks.ts). */
  rocks?: RockState;
  /** Figures glimpsed in the distance (the Lantern Lady): flickering, with a glow round them. */
  ghosts?: { who: string; x: number; y: number }[];
  /** Residents with a speech bubble over their head. */
  bubbles: { who: string; x: number; y: number; kind: (typeof EXTRAS)[number] }[];
  walker: RefObject<Walker>;
  /** Under the sea: how full the hero's lantern is (0–1). It sets how far their light reaches. */
  lantern?: RefObject<number>;
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
  sparkles = [],
  rocks,
  ghosts = [],
  lantern,
}: Props & { sheets: { city: Texture; people: Texture } }) {
  const fogTexture = useMemo(() => createFog(map.width, map.height), [map]);
  const lighting = useMemo(() => createLighting(map.night ?? '#6a74ad', fogTexture), [fogTexture, map.night]);
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
        if (t < 0) return;
        const quad = tile(t, o.x + (i % o.w), o.y + Math.floor(i / o.w), z, on);
        if (o.sway) {
          // The top row leans furthest, the bottom (the trunk's foot) not at all.
          const row = Math.floor(i / o.w);
          quad.swayTop = (o.h - row) / o.h;
          quad.swayBottom = (o.h - row - 1) / o.h;
        }
        quads.push(quad);
      });
    }
    return quadGeometry(quads, citySheet);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, citySheet, litKey]);

  // Pushable rocks (and the stones they leave in the water) change as you push them.
  const rockMesh = useMemo(() => {
    const quads: Quad[] = [];
    for (const i of rocks?.filled ?? []) quads.push(tile(FILLED_TILE, i % map.width, Math.floor(i / map.width), 0.02));
    for (const r of rocks?.rocks ?? []) quads.push(tile(ROCK_TILE, r.x, r.y, depth(r.y + 1)));
    return quadGeometry(quads, citySheet);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, citySheet, rocks]);
  useEffect(() => () => rockMesh.dispose(), [rockMesh]);

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

  // Ghosts carry their own flickering lantern light.
  const ghostLights = useMemo(
    () => ghosts.map((g) => ({ x: g.x + 0.5, y: -g.y - 0.3, r: 3.2, color: [1.3, 1.05, 0.45] as const }) as Lit),
    [ghosts],
  );
  useFrame((state, delta) => {
    onTick(Math.min(delta, 0.05));
    driftFog(fogNow, fog, fogTexture, delta);
    const flicker = 0.75 + 0.25 * Math.sin(state.clock.elapsedTime * 13) * Math.sin(state.clock.elapsedTime * 3.1);
    const all = ghostLights.length ? [...ghostLights.map((l) => ({ ...l, r: l.r * flicker })), ...lights] : lights;
    onView(frame(state, walkerPosition(walker.current), map, all, lighting, map.underwater ? (lantern?.current ?? 1) : null));
  });

  return (
    <>
      <mesh geometry={ground} material={city} />
      <mesh geometry={objects} material={city} />
      <mesh geometry={rockMesh} material={city} />
      {residents.map((r) => (
        <Person key={(r as Partial<Placed>).key ?? `${r.who}@${r.x},${r.y}`} who={r.who} x={r.x} y={r.y} facing={r.facing} sheet={peopleSheet} material={people} />
      ))}
      <Hero key={hero} who={hero} walker={walker} sheet={peopleSheet} material={people} />
      {pet && <Pet key={pet} id={pet} walker={walker} sheet={peopleSheet} material={people} />}
      {ghosts.map((g) => (
        <Ghost key={`${g.who}@${g.x},${g.y}`} {...g} sheet={peopleSheet} material={people} />
      ))}
      {sparkles.map((p) => (
        <Sparkle key={`${p.x},${p.y}`} x={p.x} y={p.y} sheet={peopleSheet} material={people} />
      ))}
      {bubbles.map((b) => (
        <Bubble key={`${b.who}@${b.x},${b.y}`} {...b} sheet={peopleSheet} material={people} />
      ))}
      {AMBIENT[map.id] && <Ambient kind={AMBIENT[map.id]!} underwater={!!map.underwater} />}
      {!map.underwater && <Dust walker={walker} />}
      {map.underwater && <SeaBubbles sheet={peopleSheet} material={people} />}
      {map.underwater && lantern && <DarkEyes walker={walker} lantern={lantern} sheet={peopleSheet} material={people} />}
    </>
  );
}

/** Bubbles drifting up from the seabed all round the camera, wobbling as they go. */
function SeaBubbles({ sheet, material }: { sheet: Sheet; material: ShaderMaterial }) {
  const g = useQuad(sheet, EXTRAS.indexOf('bubble') * T, 112, T, T, 0.5, 0.5);
  const group = useRef<Group>(null);
  const seeds = useMemo(() => Array.from({ length: 28 }, (_, i) => ({ x: (i * 7.31) % 1, y: (i * 3.77) % 1, speed: 0.6 + ((i * 0.37) % 1) * 0.9, size: 0.5 + ((i * 0.53) % 1) * 0.7 })), []);
  useFrame((state) => {
    const grp = group.current;
    if (!grp) return;
    const cam = state.camera;
    const t = state.clock.elapsedTime;
    const w = state.size.width / (cam as OrthographicCamera).zoom + 2;
    const h = state.size.height / (cam as OrthographicCamera).zoom + 2;
    // Each bubble has a place in the world and rises from it; seen through a screen-sized
    // window that wraps, so they stay put as the camera moves and never run out.
    const wrap = (v: number, lo: number, span: number) => lo + ((((v - lo) % span) + span) % span);
    grp.children.forEach((child, i) => {
      const s = seeds[i]!;
      const x = wrap(s.x * w * 3, cam.position.x - w / 2, w);
      const y = wrap(s.y * h * 3 + t * s.speed, cam.position.y - h / 2, h);
      child.position.set(x + Math.sin(t * 2 + i) * 0.15, y, 4);
      child.scale.setScalar(s.size);
    });
  });
  return (
    <group ref={group}>
      {seeds.map((_, i) => (
        <mesh key={i} geometry={g} material={material} />
      ))}
    </group>
  );
}

/**
 * When the hero's lantern runs low, eyes open in the dark around them, blinking, a little
 * closer the lower it gets. They're gone the moment the light comes back.
 */
function DarkEyes({
  walker,
  lantern,
  sheet,
  material,
}: {
  walker: RefObject<Walker>;
  lantern: RefObject<number>;
  sheet: Sheet;
  material: ShaderMaterial;
}) {
  const g = useQuad(sheet, EXTRAS.indexOf('eyes') * T, 112, T, T);
  const group = useRef<Group>(null);
  const spots = useMemo(() => [0.4, 2.1, 3.4, 4.9, 5.8].map((a, i) => ({ a, r: 3.6 + (i % 2) * 0.8, blink: 1.3 + i * 0.7 })), []);
  useFrame(({ clock }) => {
    const grp = group.current;
    if (!grp) return;
    const low = lantern.current ?? 1;
    const p = walkerPosition(walker.current);
    const t = clock.elapsedTime;
    grp.children.forEach((child, i) => {
      const s = spots[i]!;
      // More of them, the darker it gets.
      const show = low < 0.3 && i < Math.ceil((0.3 - low) / 0.06);
      const open = Math.sin(t * s.blink + i) > -0.85;
      child.visible = show && open;
      const r = s.r - (0.3 - low) * 4;
      child.position.set(p.x + Math.cos(s.a + t * 0.05) * r, -p.y + Math.sin(s.a + t * 0.05) * r * 0.7, 4);
    });
  });
  return (
    <group ref={group}>
      {spots.map((_, i) => (
        <mesh key={i} geometry={g} material={material} visible={false} />
      ))}
    </group>
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
  /** Under the sea: the hero's lantern (0–1). Null on land, where they carry a steady glow. */
  lantern: number | null,
): View {
  const camera = state.camera as OrthographicCamera;
  const { size } = state;
  const dpr = state.viewport.dpr;
  lighting.uTime.value = state.clock.elapsedTime;

  // Time of day: the ambient tint and how hard lamps glow follow the shared clock. Under the
  // sea it is always dark.
  const dl = map.underwater ? null : daylight(currentPhase());
  if (dl) {
    const night = nightRgb(map.night ?? '#6a74ad');
    const a = ambientColor(dl.phase, night);
    lighting.uAmbient.value.setRGB(a[0], a[1], a[2]);
    lighting.uDay.value = dl.day;
  }
  const lamp = dl ? dl.lamp : 1;

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
  if (lantern === null) {
    u[0]!.set(hero.x + 0.5, -hero.y - 0.4, 2.8, dl ? 1 - dl.day * 0.9 : 1);
    uc[0]!.set(0.32, 0.36, 0.48);
  } else {
    // A warm lantern whose light shrinks as it runs down (and flickers when nearly out).
    const flicker = lantern < 0.25 ? 0.85 + 0.15 * Math.sin(state.clock.elapsedTime * 23) : 1;
    u[0]!.set(hero.x + 0.5, -hero.y - 0.4, (1.1 + 3.4 * lantern) * flicker, 1);
    uc[0]!.set(0.62, 0.52, 0.32);
  }
  near.forEach(({ l }, i) => {
    u[i + 1]!.set(l.x, l.y, l.r, 1);
    uc[i + 1]!.set(l.color[0] * lamp, l.color[1] * lamp, l.color[2] * lamp);
  });
  lighting.uLightCount.value = near.length + 1;
  return { x: cx, y: cy, zoom, width: size.width, height: size.height };
}

const nightColors = new Map<string, readonly [number, number, number]>();
/** A world's night colour as rgb, parsed once. */
function nightRgb(css: string): readonly [number, number, number] {
  let c = nightColors.get(css);
  if (!c) {
    const col = new Color(css);
    nightColors.set(css, (c = [col.r, col.g, col.b]));
  }
  return c;
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
  const column = Math.max(0, PEOPLE.indexOf(who as (typeof PEOPLE)[number])) * 64;
  const g = useQuad(sheet, column + FACING_COLUMN[facing] * T, 0, T, T);
  // A gentle idle bob, so the town feels alive; walking residents glide between cells.
  const ref = useRef<Mesh>(null);
  const group = useRef<Group>(null);
  const at = useRef({ x, y, frame: -1, face: '' });
  const phase = useMemo(() => (x * 7 + y * 13) % 10, [x, y]);
  useFrame(({ clock }, delta) => {
    const a = at.current;
    const dx = x - a.x;
    const dy = y - a.y;
    const dist = Math.hypot(dx, dy);
    let moving = false;
    if (dist > 2.5) {
      a.x = x;
      a.y = y;
    } else if (dist > 0.001) {
      const step = Math.min(dist, 1.25 * Math.min(delta, 0.05));
      a.x += (dx / dist) * step;
      a.y += (dy / dist) * step;
      moving = true;
    }
    const frame = moving ? Math.floor(clock.elapsedTime * 7) % 4 : 0;
    const key = `${facing}${frame}`;
    if (key !== a.face) {
      a.face = key;
      setQuadSource(g, sheet, column + FACING_COLUMN[facing] * T, frame * T, T, T);
    }
    if (group.current) {
      group.current.position.set(Math.round(a.x * 16) / 16, -Math.round(a.y * 16) / 16, depth(a.y + 1));
    }
    if (ref.current) ref.current.position.y = !moving && Math.sin(clock.elapsedTime * 2.2 + phase) > 0.6 ? 1 / 16 : 0;
  });
  return (
    <group ref={group} position={[x, -y, depth(y + 1)]}>
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

/** Someone who isn't quite there: they bob, and flicker in and out like a candle. */
function Ghost({ who, x, y, sheet, material }: { who: string; x: number; y: number; sheet: Sheet; material: ShaderMaterial }) {
  const column = Math.max(0, PEOPLE.indexOf(who as (typeof PEOPLE)[number]));
  const g = useQuad(sheet, column * 64, 0, T, T);
  const ref = useRef<Mesh>(null);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const mesh = ref.current;
    if (!mesh) return;
    mesh.position.set(x, -y + Math.round(Math.sin(t * 1.6) * 2) / 16, depth(y + 1));
    // Mostly there, with quick gaps, like a light that can't quite stay on.
    mesh.visible = Math.sin(t * 9.3) * Math.sin(t * 2.7 + x) > -0.55;
  });
  return <mesh ref={ref} geometry={g} material={material} />;
}

/** A tiny twinkle that comes and goes: something here is worth a closer look. */
function Sparkle({ x, y, sheet, material }: { x: number; y: number; sheet: Sheet; material: ShaderMaterial }) {
  const g = useQuad(sheet, EXTRAS.indexOf('star') * T, 112, T, T, 0.5, 0.5);
  const ref = useRef<Mesh>(null);
  const phase = useMemo(() => (x * 3.7 + y * 1.3) % 6, [x, y]);
  useFrame(({ clock }) => {
    const mesh = ref.current;
    if (!mesh) return;
    const t = (clock.elapsedTime + phase) % 3;
    mesh.visible = t < 0.9;
    const s = t < 0.9 ? Math.sin((t / 0.9) * Math.PI) : 0;
    mesh.scale.setScalar(0.4 + 0.6 * s);
    mesh.position.set(x + 0.5 - 0.25 * (0.4 + 0.6 * s), -y + 0.9, 3);
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
