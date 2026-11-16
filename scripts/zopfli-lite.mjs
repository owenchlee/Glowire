// Small optimal-parse deflate (zopfli-style): iterated cost-model DP over LZ77 matches, one dynamic-Huffman block.
// Returns a zlib stream, or null when its own round-trip check fails (callers keep the zlib output then).
import { inflateSync } from 'node:zlib';

const LB = [3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 15, 17, 19, 23, 27, 31, 35, 43, 51, 59, 67, 83, 99, 115, 131, 163, 195, 227, 258];
const LE = [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 0];
const DB = [1, 2, 3, 4, 5, 7, 9, 13, 17, 25, 33, 49, 65, 97, 129, 193, 257, 385, 513, 769, 1025, 1537, 2049, 3073, 4097, 6145, 8193, 12289, 16385, 24577];
const DE = [0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 12, 12, 13, 13];
const lenCode = new Uint8Array(259), lenEnd = new Uint16Array(260), distCode = new Uint8Array(32769);
LB.forEach((b, c) => {
  for (let l = b; l < b + (1 << LE[c]) && l <= (c === 27 ? 257 : 258); l++) lenCode[l] = c;
});
lenEnd[258] = 258;
for (let l = 257; l >= 3; l--) lenEnd[l] = lenCode[l] === lenCode[l + 1] ? lenEnd[l + 1] : l;
DB.forEach((b, c) => {
  for (let d = b; d < b + (1 << DE[c]) && d <= 32768; d++) distCode[d] = c;
});

function huffLengths(freq, limit) {
  const len = new Uint8Array(freq.length);
  const leaves = [];
  freq.forEach((f, i) => f && leaves.push(i));
  if (!leaves.length) return len;
  if (leaves.length === 1) return ((len[leaves[0]] = 1), len);
  leaves.sort((a, b) => freq[a] - freq[b] || a - b);
  const L = leaves.length,
    w = leaves.map((i) => freq[i]),
    par = new Array(L).fill(-1);
  let q1 = 0,
    q2 = L;
  const take = () => (q1 < L && (q2 >= w.length || w[q1] <= w[q2]) ? q1++ : q2++);
  for (let k = 1; k < L; k++) {
    const a = take(),
      b = take();
    w.push(w[a] + w[b]);
    par.push(-1);
    par[a] = par[b] = w.length - 1;
  }
  const depth = new Array(w.length).fill(0);
  for (let i = w.length - 2; i >= 0; i--) depth[i] = depth[par[i]] + 1;
  const over = depth.slice(0, L).some((d) => d > limit);
  leaves.forEach((s, k) => (len[s] = Math.min(depth[k], limit)));
  if (over) {
    const cap = 1 << limit;
    let kraft = leaves.reduce((n, s) => n + (1 << (limit - len[s])), 0);
    while (kraft > cap) {
      let best = -1;
      for (const s of leaves)
        if (len[s] < limit && (best < 0 || len[s] > len[best] || (len[s] === len[best] && freq[s] < freq[best]))) best = s;
      kraft -= 1 << (limit - len[best] - 1);
      len[best]++;
    }
    for (;;) {
      let best = -1;
      for (const s of leaves)
        if (len[s] > 1 && 1 << (limit - len[s]) <= cap - kraft && (best < 0 || freq[s] > freq[best])) best = s;
      if (best < 0) break;
      kraft += 1 << (limit - len[best]);
      len[best]--;
    }
  }
  return len;
}

const canon = (len) => {
  const cnt = new Array(16).fill(0),
    next = new Array(16).fill(0),
    code = new Array(len.length).fill(0);
  len.forEach((l) => l && cnt[l]++);
  for (let b = 1, c = 0; b < 16; b++) next[b] = c = (c + cnt[b - 1]) << 1;
  len.forEach((l, s) => {
    if (!l) return;
    let c = next[l]++,
      r = 0;
    for (let i = 0; i < l; i++, c >>= 1) r = (r << 1) | (c & 1);
    code[s] = r;
  });
  return code;
};

// run-length code the code lengths with symbols 16/17/18
function rle(lens) {
  const out = [];
  for (let i = 0; i < lens.length; ) {
    let j = i;
    while (j < lens.length && lens[j] === lens[i]) j++;
    let run = j - i;
    if (lens[i] === 0) {
      while (run >= 11) {
        const n = Math.min(run, 138);
        out.push([18, n - 11, 7]);
        run -= n;
      }
      if (run >= 3) {
        out.push([17, run - 3, 3]);
        run = 0;
      }
    } else {
      out.push([lens[i], 0, 0]);
      run--;
      while (run >= 3) {
        const n = Math.min(run, 6);
        out.push([16, n - 3, 2]);
        run -= n;
      }
    }
    while (run-- > 0) out.push([lens[i], 0, 0]);
    i = j;
  }
  return out;
}

function encode(ops, emit, w, final = true) {
  const lf = new Array(286).fill(0),
    df = new Array(30).fill(0);
  for (const [l, d] of ops) {
    if (!l) lf[d]++;
    else {
      lf[257 + lenCode[l]]++;
      df[distCode[d]]++;
    }
  }
  lf[256] = 1;
  const ll = huffLengths(lf, 15),
    dl = huffLengths(df, 15);
  if (!dl.some(Boolean)) dl[0] = 1;
  let nl = 286,
    nd = 30;
  while (nl > 257 && !ll[nl - 1]) nl--;
  while (nd > 1 && !dl[nd - 1]) nd--;
  const seq = rle([...ll.slice(0, nl), ...dl.slice(0, nd)]);
  const cf = new Array(19).fill(0);
  seq.forEach(([s]) => cf[s]++);
  const cl = huffLengths(cf, 7);
  const ORD = [16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15];
  let nc = 19;
  while (nc > 4 && !cl[ORD[nc - 1]]) nc--;
  let bits = 17 + nc * 3;
  seq.forEach(([s, , eb]) => (bits += cl[s] + eb));
  for (const [l, d] of ops)
    bits += l ? ll[257 + lenCode[l]] + LE[lenCode[l]] + dl[distCode[d]] + DE[distCode[d]] : ll[d];
  bits += ll[256];
  if (!emit) return { bits, ll, dl };
  const lc = canon(ll),
    dc = canon(dl),
    cc = canon(cl),
    put = w.put;
  put(final ? 1 : 0, 1);
  put(2, 2);
  put(nl - 257, 5);
  put(nd - 1, 5);
  put(nc - 4, 4);
  for (let i = 0; i < nc; i++) put(cl[ORD[i]], 3);
  for (const [s, e, eb] of seq) {
    put(cc[s], cl[s]);
    if (eb) put(e, eb);
  }
  for (const [l, d] of ops) {
    if (!l) {
      put(lc[d], ll[d]);
      continue;
    }
    const c = lenCode[l],
      dcd = distCode[d];
    put(lc[257 + c], ll[257 + c]);
    put(l - LB[c], LE[c]);
    put(dc[dcd], dl[dcd]);
    put(d - DB[dcd], DE[dcd]);
  }
  put(lc[256], ll[256]);
}

function writer() {
  const out = [];
  let buf = 0,
    n = 0;
  return {
    put(v, k) {
      buf |= v << n;
      n += k;
      while (n >= 8) {
        out.push(buf & 255);
        buf >>>= 8;
        n -= 8;
      }
    },
    done() {
      if (n) out.push(buf & 255);
      return Buffer.from(out);
    },
  };
}

export function deflateOptimal(data, { chain = 128, rounds = 12 } = {}) {
  const n = data.length;
  // Pareto matches per position: ascending length, ascending distance
  const head = new Int32Array(65536).fill(-1),
    prev = new Int32Array(n),
    start = new Int32Array(n + 1);
  const mem = [];
  const hash = (i) => Math.imul((data[i] << 16) | (data[i + 1] << 8) | data[i + 2], 2654435761) >>> 16;
  for (let i = 0; i < n; i++) {
    start[i] = mem.length;
    if (i + 2 < n) {
      const h = hash(i),
        max = Math.min(258, n - i);
      let best = 2,
        p = head[h];
      for (let c = 0; p >= 0 && i - p <= 32768 && c < chain && best < max; c++, p = prev[p]) {
        let l = 0;
        while (l < max && data[p + l] === data[i + l]) l++;
        if (l > best) {
          best = l;
          mem.push(l, i - p);
        }
      }
      prev[i] = head[h];
      head[h] = i;
    }
  }
  start[n] = mem.length;
  const litCost = new Float64Array(256).fill(8),
    lenCost = new Float64Array(259),
    distCost = new Float64Array(30).fill(5);
  for (let l = 3; l <= 258; l++) lenCost[l] = 7 + LE[lenCode[l]];
  let best = null;
  const cost = new Float64Array(n + 1),
    fl = new Uint16Array(n + 1),
    fd = new Uint16Array(n + 1);
  for (let r = 0; r < rounds; r++) {
    cost.fill(Infinity);
    cost[0] = 0;
    for (let i = 0; i < n; i++) {
      const c = cost[i];
      if (c + litCost[data[i]] < cost[i + 1]) {
        cost[i + 1] = c + litCost[data[i]];
        fl[i + 1] = 0;
      }
      let from = 3;
      for (let k = start[i]; k < start[i + 1]; k += 2) {
        const L = mem[k],
          d = mem[k + 1],
          dc = c + distCost[distCode[d]] + DE[distCode[d]];
        for (let l = from; l <= L; l++) {
          if (l !== from && l !== L && lenEnd[l] !== l) continue;
          const v = dc + lenCost[l];
          if (v < cost[i + l]) {
            cost[i + l] = v;
            fl[i + l] = l;
            fd[i + l] = d;
          }
        }
        from = L + 1;
      }
    }
    const ops = [];
    for (let i = n; i > 0; ) {
      if (fl[i]) {
        ops.push([fl[i], fd[i]]);
        i -= fl[i];
      } else {
        ops.push([0, data[i - 1]]);
        i--;
      }
    }
    ops.reverse();
    const { bits, ll, dl } = encode(ops, false);
    if (!best || bits < best.bits) best = { bits, ops };
    const cl = (len) => len || 15;
    for (let s = 0; s < 256; s++) litCost[s] = cl(ll[s]);
    for (let l = 3; l <= 258; l++) lenCost[l] = cl(ll[257 + lenCode[l]]) + LE[lenCode[l]];
    for (let c = 0; c < 30; c++) distCost[c] = cl(dl[c]);
  }
  // split the best parse into k equal-length blocks, each with its own Huffman tables; keep the cheapest k
  const split = (k) => Array.from({ length: k }, (_, i) => best.ops.slice(Math.floor((best.ops.length * i) / k), Math.floor((best.ops.length * (i + 1)) / k)));
  let bk = 1,
    bb = Infinity;
  for (let k = 1; k <= 24; k++) {
    const bits = split(k).reduce((t, o) => t + encode(o, false).bits, 0);
    if (bits < bb) ((bb = bits), (bk = k));
  }
  const w = writer();
  split(bk).forEach((o, i, a) => encode(o, true, w, i === a.length - 1));
  const raw = w.done();
  let a = 1,
    b = 0;
  for (let i = 0; i < n; i++) {
    a = (a + data[i]) % 65521;
    b = (b + a) % 65521;
  }
  const tail = Buffer.alloc(4);
  tail.writeUInt32BE(((b << 16) | a) >>> 0);
  const z = Buffer.concat([Buffer.from([0x78, 0xda]), raw, tail]);
  try {
    return inflateSync(z).equals(data) ? z : null;
  } catch {
    return null;
  }
}
