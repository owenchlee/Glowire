// Behind the floating puzzle board: the street where the job is, drawn from the world map
// at night, so a puzzle feels like it's happening right there on the client's doorstep.
// It hangs behind the board facing the camera and fills the view, like a painted scenery
// flat in a puppet theatre.

import { useEffect, useMemo, useRef, useState } from 'react';
import { Color, type Group, type OrthographicCamera, type Texture } from 'three';

import { EXTRAS, PEOPLE } from '../world/people.generated';
import type { Resident, WorldMap } from '../world/types';
import { MAX_LIGHTS, createLighting, loadPixelTexture, worldMaterial } from '../world-view/pixels';
import { type Quad, type Sheet, quadGeometry } from '../world-view/quads';
import { useFrame, useThree } from './r3f';

const WORLD_SHEET = require('../../assets/art/world.png');
const PEOPLE_SHEET = require('../../assets/art/people.png');
const T = 16;

export interface BackdropSpec {
  map: WorldMap;
  /** The cell to centre on (the job's door). */
  x: number;
  y: number;
  lit: Set<string>;
  residents: Resident[];
}

/** How many map cells the backdrop shows top to bottom. */
const CELLS_TALL = 11;
/** How far behind the board it hangs, along the camera's view. */
const DISTANCE = 30;

/** `boardWidth`: the board's width in scene units, so the job's door can stand just beside it. */
export function Backdrop({ spec, boardWidth }: { spec: BackdropSpec; boardWidth: number }) {
  const [sheets, setSheets] = useState<{ world: Texture; people: Texture } | null>(null);
  useEffect(() => {
    let alive = true;
    Promise.all([loadPixelTexture(WORLD_SHEET), loadPixelTexture(PEOPLE_SHEET)]).then(([world, people]) => {
      if (alive) setSheets({ world, people });
    });
    return () => {
      alive = false;
    };
  }, []);
  return sheets ? <Scenery spec={spec} sheets={sheets} boardWidth={boardWidth} /> : null;
}

function Scenery({
  spec,
  sheets,
  boardWidth,
}: {
  spec: BackdropSpec;
  sheets: { world: Texture; people: Texture };
  boardWidth: number;
}) {
  const { map, x: cx, y: cy, lit, residents } = spec;
  const camera = useThree((s) => s.camera) as OrthographicCamera;
  const size = useThree((s) => s.size);
  const group = useRef<Group>(null);

  // Darker than the town itself, so the board in front stands out.
  const lighting = useMemo(() => createLighting('#5a64a0'), []);
  const worldMat = useMemo(() => worldMaterial(sheets.world, lighting, 0, true), [sheets.world, lighting]);
  const peopleMat = useMemo(() => worldMaterial(sheets.people, lighting, 1, true), [sheets.people, lighting]);
  useEffect(
    () => () => {
      worldMat.dispose();
      peopleMat.dispose();
    },
    [worldMat, peopleMat],
  );

  // Every cell that could show on a wide screen, around the job.
  const halfW = 20;
  const halfH = 8;
  const geometry = useMemo(() => {
    const img = sheets.world.image as { width: number; height: number };
    const sheet: Sheet = { width: img.width, height: img.height };
    const cols = img.width / T;
    const quads: Quad[] = [];
    const tile = (t: number, x: number, y: number, z: number, on = 0) =>
      quads.push({ x, y, sx: (t % cols) * T, sy: Math.floor(t / cols) * T, sw: T, sh: T, z, lit: on });
    const x0 = Math.max(0, cx - halfW);
    const x1 = Math.min(map.width, cx + halfW);
    const y0 = Math.max(0, cy - halfH);
    const y1 = Math.min(map.height, cy + halfH);
    for (let y = y0; y < y1; y++)
      for (let x = x0; x < x1; x++) {
        const g = map.ground[y * map.width + x]!;
        const d = map.decal[y * map.width + x]!;
        if (g >= 0) tile(g, x, y, 0);
        if (d >= 0) tile(d, x, y, 0.01);
      }
    for (const o of map.objects) {
      if (o.until && lit.has(o.until)) continue;
      if (o.x + o.w < x0 || o.x > x1 || o.y + o.h < y0 || o.y > y1) continue;
      const on = o.group && lit.has(o.group) ? 1 : 0;
      o.tiles.forEach((t, i) => {
        if (t >= 0) tile(t, o.x + (i % o.w), o.y + Math.floor(i / o.w), o.flat ? 0.02 : 1 + (o.y + o.h) * 0.01, on);
      });
    }
    return quadGeometry(quads, sheet);
  }, [map, cx, cy, lit, sheets.world]);

  const people = useMemo(() => {
    const img = sheets.people.image as { width: number; height: number };
    const sheet: Sheet = { width: img.width, height: img.height };
    const quads: Quad[] = [];
    const face = { down: 0, up: 1, left: 2, right: 3 } as const;
    for (const r of residents) {
      if (Math.abs(r.x - cx) > halfW || Math.abs(r.y - cy) > halfH) continue;
      const col = Math.max(0, PEOPLE.indexOf(r.who as (typeof PEOPLE)[number]));
      const z = 1 + (r.y + 1) * 0.01 + 0.004;
      quads.push({ x: r.x, y: r.y + 0.3, w: 1, h: 0.75, sx: 0, sy: 112 + 4, sw: 16, sh: 12, z: z - 0.002 });
      quads.push({ x: r.x, y: r.y, sx: col * 64 + face[r.facing] * T, sy: 0, sw: T, sh: T, z });
    }
    void EXTRAS;
    return quadGeometry(quads, sheet);
  }, [residents, cx, cy, sheets.people]);

  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(() => () => people.dispose(), [people]);

  // The lights that are on near the job (in map cells: y runs downward, so it's flipped).
  useEffect(() => {
    const near = map.lights
      .filter((l) => lit.has(l.group))
      .map((l) => ({ l, d: Math.abs(l.x - cx) + Math.abs(l.y - cy) }))
      .filter((e) => e.d < halfW + halfH)
      .sort((a, b) => a.d - b.d)
      .slice(0, MAX_LIGHTS - 1);
    const u = lighting.uLights.value;
    const uc = lighting.uLightColors.value;
    // A soft pool of light where the board would be, like the apprentice's work lamp.
    u[0]!.set(cx + 0.5, -cy - 0.5, 7, 1);
    uc[0]!.set(0.55, 0.48, 0.4);
    near.forEach(({ l }, i) => {
      const c = new Color(l.color);
      u[i + 1]!.set(l.x, -l.y, l.radius, 1);
      uc[i + 1]!.set(c.r * 1.2, c.g * 1.2, c.b * 1.2);
    });
    lighting.uLightCount.value = near.length + 1;
  }, [map, lit, cx, cy, lighting]);

  // Hang it behind the board, square to the camera, filling the view.
  useFrame(({ clock }) => {
    const g = group.current;
    if (!g) return;
    lighting.uTime.value = clock.elapsedTime;
    const viewH = (camera.top - camera.bottom) / camera.zoom;
    const viewW = (camera.right - camera.left) / camera.zoom;
    const cell = Math.max(viewH / CELLS_TALL, viewW / (halfW * 2 - 2));
    g.quaternion.copy(camera.quaternion);
    g.position.copy(camera.position);
    const forward = camera.getWorldDirection(g.userData.dir ?? (g.userData.dir = camera.position.clone()));
    g.position.addScaledVector(forward, DISTANCE);
    g.scale.setScalar(cell);
    // Put the job's door just right of the board, so the house shows beside it.
    const beside = (boardWidth / 2 + 0.3) / cell + 1.2;
    g.children.forEach((c) => c.position.set(-(cx + 0.5) + beside, cy - 0.5, 0));
  });
  void size;

  return (
    <group ref={group} renderOrder={-1}>
      <mesh geometry={geometry} material={worldMat} renderOrder={-2} />
      <mesh geometry={people} material={peopleMat} renderOrder={-2} />
    </group>
  );
}
