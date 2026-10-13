// Draws a whole world map to a PNG, so a map can be checked (and shown off) without
// walking around it in the game.
//
//   npm run map-preview -- glowtown            → map-glowtown.png in the working directory
//   MAP_OUT=docs/history/v0.6 npm run map-preview -- glowtown
//   MAP_IDS=glowtown MAP_CROP=150,0,30,40 MAP_SCALE=2 npm run map-preview   → just those cells
//
// It runs through vitest (which already compiles TypeScript), as a single "test".

import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { PNG } from 'pngjs';
import { test } from 'vitest';

import { PEOPLE } from '../src/world/people.generated';
import { WORLDS, worldMap } from '../src/world/worlds';
import type { WorldMap } from '../src/world/types';

const T = 16;

function draw(map: WorldMap, opts: { scale: number; lit: boolean }) {
  const atlas = PNG.sync.read(readFileSync('assets/art/world.png'));
  const people = PNG.sync.read(readFileSync('assets/art/people.png'));
  const cols = atlas.width / T;
  const [cx0, cy0, cw, ch] = (process.env.MAP_CROP ?? `0,0,${map.width},${map.height}`).split(',').map(Number);
  const crop = { x: cx0!, y: cy0!, w: Math.min(cw!, map.width - cx0!), h: Math.min(ch!, map.height - cy0!) };
  const out = new PNG({ width: crop.w * T * opts.scale, height: crop.h * T * opts.scale });
  const W = map.width * T;
  const H = map.height * T;
  const buf = new Uint8Array(W * H * 3);

  const blit = (src: { width: number; data: Uint8Array }, sx: number, sy: number, dx: number, dy: number, sw = T, sh = T) => {
    for (let y = 0; y < sh; y++)
      for (let x = 0; x < sw; x++) {
        const px = dx + x;
        const py = dy + y;
        if (px < 0 || py < 0 || px >= W || py >= H) continue;
        const i = ((sy + y) * src.width + sx + x) * 4;
        if (src.data[i + 3]! < 128) continue;
        const o = (py * W + px) * 3;
        buf[o] = src.data[i]!;
        buf[o + 1] = src.data[i + 1]!;
        buf[o + 2] = src.data[i + 2]!;
      }
  };
  const tile = (t: number, x: number, y: number) => blit(atlas, (t % cols) * T, Math.floor(t / cols) * T, x * T, y * T);

  for (let y = 0; y < map.height; y++)
    for (let x = 0; x < map.width; x++) {
      const g = map.ground[y * map.width + x]!;
      const d = map.decal[y * map.width + x]!;
      if (g >= 0) tile(g, x, y);
      if (d >= 0) tile(d, x, y);
    }
  type Item = { z: number; draw: () => void };
  const items: Item[] = [];
  for (const o of map.objects) {
    if (o.until && opts.lit) continue;
    items.push({
      z: o.flat ? -1 : o.y + o.h,
      draw: () => o.tiles.forEach((t, i) => t >= 0 && tile(t, o.x + (i % o.w), o.y + Math.floor(i / o.w))),
    });
  }
  for (const r of map.residents) {
    const col = Math.max(0, PEOPLE.indexOf(r.who as (typeof PEOPLE)[number]));
    const face = { down: 0, up: 1, left: 2, right: 3 }[r.facing];
    items.push({ z: r.y + 1, draw: () => blit(people, col * 64 + face * T, 0, r.x * T, r.y * T) });
  }
  items.push({ z: map.spawn.y + 1, draw: () => blit(people, 0, 0, map.spawn.x * T, map.spawn.y * T) });
  items.sort((a, b) => a.z - b.z).forEach((i) => i.draw());

  // Area borders, faintly, so the route reads at a glance.
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const cx = Math.floor(x / T);
      const cy = Math.floor(y / T);
      const a = map.areaOf[cy * map.width + cx];
      const edge =
        (x % T === 0 && cx > 0 && map.areaOf[cy * map.width + cx - 1] !== a) ||
        (y % T === 0 && cy > 0 && map.areaOf[(cy - 1) * map.width + cx] !== a);
      if (edge && process.env.MAP_AREAS) {
        const o = (y * W + x) * 3;
        buf[o] = 255;
        buf[o + 1] = 60;
        buf[o + 2] = 200;
      }
    }

  for (let y = 0; y < out.height; y++)
    for (let x = 0; x < out.width; x++) {
      const i = ((Math.floor(y / opts.scale) + crop.y * T) * W + Math.floor(x / opts.scale) + crop.x * T) * 3;
      const o = (y * out.width + x) * 4;
      out.data[o] = buf[i]!;
      out.data[o + 1] = buf[i + 1]!;
      out.data[o + 2] = buf[i + 2]!;
      out.data[o + 3] = 255;
    }
  return out;
}

test('map preview', () => {
  const ids = (process.env.MAP_IDS ?? WORLDS.filter((w) => w.build).map((w) => w.id).join(',')).split(',');
  for (const id of ids) {
    const map = worldMap(id);
    if (!map) continue;
    const png = draw(map, { scale: Number(process.env.MAP_SCALE ?? 1), lit: !!process.env.MAP_LIT });
    const file = join(process.env.MAP_OUT ?? '.', `map-${id}.png`);
    writeFileSync(file, PNG.sync.write(png));
    console.log('wrote', file, png.width, '×', png.height);
  }
});
