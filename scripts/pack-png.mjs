// Lossless PNG packing: exact-RGBA palette (8-bit indexed + tRNS), filter 0, zlib level 9.
// Run directly to rewrite every PNG under assets/art in place.
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync, crc32, constants } from 'node:zlib';
import { PNG } from 'pngjs';

const chunk = (type, data) => {
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const out = Buffer.alloc(body.length + 8);
  out.writeUInt32BE(data.length, 0);
  body.copy(out, 4);
  out.writeUInt32BE(crc32(body), body.length + 4);
  return out;
};

export function encodePacked(png) {
  const { width: w, height: h, data } = png;
  const ids = new Map();
  const idx = Buffer.alloc(w * h);
  for (let i = 0; i < w * h; i++) {
    const key = data.readUInt32BE(i * 4);
    let id = ids.get(key);
    if (id === undefined) {
      if (ids.size === 256) return PNG.sync.write(png); // shortcut: >256 colours falls back to RGBA
      id = ids.size;
      ids.set(key, id);
    }
    idx[i] = id;
  }
  const plte = Buffer.alloc(ids.size * 3);
  const trns = Buffer.alloc(ids.size);
  for (const [key, id] of ids) {
    plte[id * 3] = key >>> 24;
    plte[id * 3 + 1] = (key >>> 16) & 255;
    plte[id * 3 + 2] = (key >>> 8) & 255;
    trns[id] = key & 255;
  }
  const raw = Buffer.alloc(h * (w + 1));
  for (let y = 0; y < h; y++) idx.copy(raw, y * (w + 1) + 1, y * w, (y + 1) * w);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = 3;
  const parts = [Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('PLTE', plte)];
  if (trns.some((a) => a !== 255)) parts.push(chunk('tRNS', trns));
  parts.push(chunk('IDAT', deflateSync(raw, { level: 9, memLevel: 9, strategy: constants.Z_DEFAULT_STRATEGY })), chunk('IEND', Buffer.alloc(0)));
  return Buffer.concat(parts);
}

const walk = (d) =>
  readdirSync(d).flatMap((n) => (statSync(join(d, n)).isDirectory() ? walk(join(d, n)) : n.endsWith('.png') ? [join(d, n)] : []));

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  for (const f of walk('assets/art')) {
    const png = PNG.sync.read(readFileSync(f));
    const out = encodePacked(png);
    const back = PNG.sync.read(out);
    if (!back.data.equals(png.data)) throw new Error(`pixel mismatch: ${f}`);
    writeFileSync(f, out);
  }
}
