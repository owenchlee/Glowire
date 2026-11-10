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

export function encodePacked(png, byAppearance) {
  if (byAppearance === undefined) {
    const [a, b] = [false, true].map((o) => encodePacked(png, o));
    return b.length < a.length ? b : a;
  }
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
  // most frequent colour gets index 0: smaller, more repetitive filtered rows
  const count = new Array(ids.size).fill(0);
  for (let i = 0; i < idx.length; i++) count[idx[i]]++;
  const order = byAppearance ? [...count.keys()] : [...count.keys()].sort((a, b) => count[b] - count[a]);
  const remap = new Array(ids.size);
  order.forEach((old, rank) => (remap[old] = rank));
  for (let i = 0; i < idx.length; i++) idx[i] = remap[idx[i]];
  for (const [key, id] of ids) ids.set(key, remap[id]);
  const plte = Buffer.alloc(ids.size * 3);
  const trns = Buffer.alloc(ids.size);
  for (const [key, id] of ids) {
    plte[id * 3] = key >>> 24;
    plte[id * 3 + 1] = (key >>> 16) & 255;
    plte[id * 3 + 2] = (key >>> 8) & 255;
    trns[id] = key & 255;
  }
  const depth = ids.size <= 2 ? 1 : ids.size <= 4 ? 2 : ids.size <= 16 ? 4 : 8;
  const stride = Math.ceil((w * depth) / 8);
  const rows = [];
  for (let y = 0; y < h; y++) {
    const r = Buffer.alloc(stride);
    for (let x = 0; x < w; x++) r[(x * depth) >> 3] |= idx[y * w + x] << (8 - depth - ((x * depth) & 7));
    rows.push(r);
  }
  const paeth = (a, b, c) => {
    const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
    return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
  };
  // filter distance is one byte for every indexed depth
  const filtered = (t, prev, cur) => {
    const o = Buffer.alloc(stride);
    for (let i = 0; i < stride; i++) {
      const a = i ? cur[i - 1] : 0, b = prev[i], c = i ? prev[i - 1] : 0;
      o[i] = (cur[i] - [0, a, b, (a + b) >> 1, paeth(a, b, c)][t]) & 255;
    }
    return o;
  };
  const score = (f) => f.reduce((n, v) => n + (v < 128 ? v : 256 - v), 0);
  const zero = Buffer.alloc(stride);
  const build = (adaptive, fixed = 0) =>
    Buffer.concat(
      rows.map((cur, y) => {
        const prev = y ? rows[y - 1] : zero;
        let best = [fixed, filtered(fixed, prev, cur)];
        if (adaptive)
          for (let t = 1; t < 5; t++) {
            const f = filtered(t, prev, cur);
            if (score(f) < score(best[1])) best = [t, f];
          }
        return Buffer.concat([Buffer.from([best[0]]), best[1]]);
      }),
    );
  let idat;
  for (const raw of [build(false), build(true), ...[1, 2, 3, 4].map((t) => build(false, t))])
    for (const strategy of [constants.Z_DEFAULT_STRATEGY, constants.Z_FILTERED]) {
      const z = deflateSync(raw, { level: 9, memLevel: 9, strategy });
      if (!idat || z.length < idat.length) idat = z;
    }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = depth;
  ihdr[9] = 3;
  const parts = [Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('PLTE', plte)];
  let tn = trns.length;
  while (tn && trns[tn - 1] === 255) tn--; // tRNS may stop early: missing entries are opaque
  if (tn) parts.push(chunk('tRNS', trns.subarray(0, tn)));
  parts.push(chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0)));
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
