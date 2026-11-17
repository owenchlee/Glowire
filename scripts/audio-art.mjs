// Procedural sound for Glowire: a looping night theme, footsteps per surface, and a few
// UI/world one-shots, all synthesised here and written as mono 16-bit 22050 Hz WAVs into
// assets/audio/. Deterministic (seeded noise), so re-running gives the same files.
//
// music-town, music-boss, success, chest-open, fail, rock-push, step-water-1..3, step-sand-1..3, step-dirt-1..3 and step-wood-1..3 are then re-encoded to mp3 (48 kbps music-town, 56 kbps music-boss, 64 kbps sfx, 128 kbps water steps (noisy, need it for 24 dB SNR)) with ffmpeg (on PATH) and its WAV removed,
// to keep the app download small; no padding is added, so the loop stays seamless.
//
//   node scripts/audio-art.mjs

import { Buffer } from 'node:buffer';
import { execFileSync } from 'node:child_process';
import { mkdirSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const RATE = 22050;
const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'assets', 'audio');
const TAU = Math.PI * 2;

// ── Basics ───────────────────────────────────────────────────────────────────

let seed = 1;
/** Seeded random in [0, 1) (mulberry32). */
function rand() {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const noise = () => rand() * 2 - 1;
const mtof = (m) => 440 * 2 ** ((m - 69) / 12);
const NOTE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
/** 'G#4' → MIDI number. */
const midi = (s) =>
  NOTE[s[0]] +
  (s[1] === '#' ? 1 : s[1] === 'b' ? -1 : 0) +
  12 * (Number(s.slice(s[1] === '#' || s[1] === 'b' ? 2 : 1)) + 1);
const buf = (seconds) => new Float32Array(Math.round(seconds * RATE));

/** RBJ biquad, run in place over a buffer. `f` may be a function of the sample index (a sweep). */
function biquad(x, type, f, q = 0.707) {
  let x1 = 0,
    x2 = 0,
    y1 = 0,
    y2 = 0;
  for (let i = 0; i < x.length; i++) {
    const fr = typeof f === 'function' ? f(i) : f;
    const w = (TAU * Math.min(fr, RATE * 0.45)) / RATE;
    const cos = Math.cos(w),
      alpha = Math.sin(w) / (2 * q);
    let b0, b1, b2;
    if (type === 'lp') [b0, b1, b2] = [(1 - cos) / 2, 1 - cos, (1 - cos) / 2];
    else if (type === 'hp') [b0, b1, b2] = [(1 + cos) / 2, -(1 + cos), (1 + cos) / 2];
    else [b0, b1, b2] = [alpha, 0, -alpha]; // band-pass, 0 dB peak
    const a0 = 1 + alpha,
      a1 = -2 * cos,
      a2 = 1 - alpha;
    const y = (b0 * x[i] + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2) / a0;
    x2 = x1;
    x1 = x[i];
    y2 = y1;
    y1 = y;
    x[i] = y;
  }
  return x;
}

const peak = (x) => x.reduce((m, v) => Math.max(m, Math.abs(v)), 0);
function normalize(x, to) {
  const p = peak(x) || 1;
  for (let i = 0; i < x.length; i++) x[i] *= to / p;
  return x;
}
/** Short fades at both ends so a one-shot never starts or stops with a click. */
function edges(x, ms = 3) {
  const n = Math.min(Math.round((ms / 1000) * RATE), x.length >> 1);
  for (let i = 0; i < n; i++) {
    x[i] *= i / n;
    x[x.length - 1 - i] *= i / n;
  }
  return x;
}
function mix(into, x, at = 0, gain = 1) {
  const o = Math.round(at * RATE);
  for (let i = 0; i < x.length && o + i < into.length; i++) into[o + i] += x[i] * gain;
  return into;
}

function writeWav(name, x) {
  const data = Buffer.alloc(x.length * 2);
  for (let i = 0; i < x.length; i++)
    data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, x[i])) * 32767), i * 2);
  const h = Buffer.alloc(44);
  h.write('RIFF', 0);
  h.writeUInt32LE(36 + data.length, 4);
  h.write('WAVE', 8);
  h.write('fmt ', 12);
  h.writeUInt32LE(16, 16);
  h.writeUInt16LE(1, 20);
  h.writeUInt16LE(1, 22);
  h.writeUInt32LE(RATE, 24);
  h.writeUInt32LE(RATE * 2, 28);
  h.writeUInt16LE(2, 32);
  h.writeUInt16LE(16, 34);
  h.write('data', 36);
  h.writeUInt32LE(data.length, 40);
  writeFileSync(join(OUT, `${name}.wav`), Buffer.concat([h, data]));
  if (['music-town', 'music-boss', 'success', 'chest-open', 'fail', 'rock-push'].includes(name) || name.startsWith('step-water-') || name.startsWith('step-sand-') || name.startsWith('step-dirt-') || name.startsWith('step-wood-')) {
    const wav = join(OUT, `${name}.wav`);
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', wav, '-c:a', 'libmp3lame', '-b:a', name === 'music-town' ? '48k' : name.startsWith('music') ? '56k' : name.startsWith('step-') ? (/dirt|wood/.test(name) ? '160k' : '128k') : '64k', join(OUT, `${name}.mp3`)]);
    unlinkSync(wav);
  }
  console.log(
    `${name}.wav  ${(x.length / RATE).toFixed(2)}s  ${((44 + data.length) / 1024).toFixed(0)} KB`,
  );
}

// Oscillators, phase in cycles.
const osc = {
  sine: (p) => Math.sin(TAU * p),
  tri: (p) => 1 - 4 * Math.abs((p % 1) - 0.5),
  pulse: (p, duty = 0.25) => (p % 1 < duty ? 1 : -1) - (2 * duty - 1),
  saw: (p) => 2 * (p % 1) - 1,
};

/** A decaying tone: `f` Hz (or a function of time), shape, attack and exponential decay (seconds). */
function tone(seconds, f, { shape = 'sine', attack = 0.002, decay = 0.2, vol = 1 } = {}) {
  const x = buf(seconds);
  let p = 0;
  for (let i = 0; i < x.length; i++) {
    const t = i / RATE;
    p += (typeof f === 'function' ? f(t) : f) / RATE;
    const env = Math.min(1, t / attack) * Math.exp(-t / decay);
    x[i] = osc[shape](p) * env * vol;
  }
  return x;
}

/** Noise shaped by an envelope function of time. */
function noiseBurst(seconds, env) {
  const x = buf(seconds);
  for (let i = 0; i < x.length; i++) x[i] = noise() * env(i / RATE);
  return x;
}

// A minor / C major colour, with a deceptive E7 → Fmaj7 turn back to the top.
const TOWN_CHORDS = [
    ['F2', ['F3', 'A3', 'C4', 'E4']],
    ['E2', ['E3', 'G3', 'B3', 'D4']],
    ['A2', ['G3', 'A3', 'C4', 'E4']],
    ['G2', ['G3', 'A3', 'C4', 'E4']],
    ['D2', ['A3', 'C4', 'D4', 'F4']],
    ['G2', ['G3', 'B3', 'D4', 'E4']],
    ['C3', ['E3', 'G3', 'B3', 'C4']],
    ['E2', ['E3', 'A3', 'B3', 'D4'], ['E3', 'G#3', 'B3', 'D4']],
    ['F2', ['F3', 'A3', 'C4', 'E4']],
    ['G2', ['G3', 'B3', 'D4', 'G4']],
    ['E2', ['E3', 'G3', 'B3', 'D4']],
    ['A2', ['G3', 'A3', 'C4', 'E4']],
    ['D2', ['F3', 'A3', 'C4', 'D4']],
    ['E2', ['E3', 'G3', 'B3', 'D4']],
    ['F2', ['F3', 'A3', 'C4', 'E4']],
    ['E2', ['E3', 'A3', 'B3', 'D4'], ['E3', 'G#3', 'B3', 'D4']],
];
// Melody in eighth notes: a note, '-' to hold it, '.' for a rest.
const TOWN_MELODY = [
    '. . C5 - E5 - G5 -',
    'E5 - - - D5 - B4 -',
    'C5 - - - - - A4 -',
    'G4 - A4 - C5 - D5 -',
    'E5 - - - F5 - E5 -',
    'D5 - - - B4 - G4 -',
    'B4 - C5 - G4 - - -',
    'A4 - - - G#4 - - -',
    'A4 - C5 - F5 - - E5',
    'D5 - - - - - B4 -',
    'G5 - - - E5 - - D5',
    'C5 - - - - - . .',
    'F5 - E5 - D5 - A4 -',
    'B4 - - - G4 - E4 -',
    'A4 - - - C5 - E5 -',
    'D5 - - - B4 - G#4 -',
];

// ── Music: "Lamplight Lane", a gentle 16-bar loop ────────────────────────────

function music({ bpm = 80, chords = TOWN_CHORDS, melody = TOWN_MELODY, leadShape = 'tri', drive = false } = {}) {
  const BPM = bpm;
  const beat = 60 / BPM;
  const bar = beat * 4;
  const BARS = chords.length;
  const L = Math.round(BARS * bar * RATE);
  const lead = new Float32Array(L);
  const bed = new Float32Array(L); // pad, bass, arp, drums
  /** Add into a circular buffer, so tails past the end wrap to the start: a seamless loop. */
  const put = (into, i, v) => (into[((i % L) + L) % L] += v);


  /** One synth note into a circular buffer. */
  function voice(
    into,
    m,
    start,
    dur,
    { shape, vol, attack, release, cutoff, vibrato = 0, detune = 0 },
  ) {
    const s0 = Math.round(start * RATE);
    const n = Math.round((dur + release) * RATE);
    const f = mtof(m);
    let p = rand(),
      p2 = rand(),
      lp = 0;
    const a = 1 - Math.exp((-TAU * cutoff) / RATE); // one-pole low-pass: soft, round edges
    for (let i = 0; i < n; i++) {
      const t = i / RATE;
      const vib = vibrato ? 1 + vibrato * Math.sin(TAU * 5 * t) * Math.min(1, t / 0.4) : 1;
      p += (f * vib) / RATE;
      p2 += (f * vib * (1 + detune)) / RATE;
      let v = osc[shape](p);
      if (detune) v = (v + osc[shape](p2)) / 2;
      lp += a * (v - lp);
      const env = Math.min(1, t / attack) * (t < dur ? 1 : Math.exp(-(t - dur) / (release / 4)));
      put(into, s0 + i, lp * env * vol);
    }
  }

  for (let b = 0; b < BARS; b++) {
    const t0 = b * bar;
    const [root, ...shapes] = chords[b];
    // Pad: soft detuned saws, low-passed, each chord shape held for its share of the bar.
    shapes.forEach((notes, k) => {
      const len = bar / shapes.length;
      for (const n of notes)
        voice(bed, midi(n), t0 + k * len, len, {
          shape: 'saw',
          vol: 0.05,
          attack: 0.5,
          release: 0.8,
          cutoff: 550,
          detune: 0.004,
        });
    });
    // Bass: root, fifth on the and-of-2, root again on 3.
    const r = midi(root);
    voice(bed, r, t0, beat * 1.4, {
      shape: 'tri',
      vol: 0.32,
      attack: 0.01,
      release: 0.25,
      cutoff: 600,
    });
    voice(bed, r + 7, t0 + beat * 1.5, beat * 0.9, {
      shape: 'tri',
      vol: 0.22,
      attack: 0.01,
      release: 0.2,
      cutoff: 600,
    });
    voice(bed, r, t0 + beat * 2, beat * 1.8, {
      shape: 'tri',
      vol: 0.28,
      attack: 0.01,
      release: 0.3,
      cutoff: 600,
    });
    // Music-box arpeggio in the second half (and quietly in bars 5–8), up through the chord.
    if (drive || b >= 4) {
      const order = [0, 1, 2, 3, 2, 1, 2, 3];
      for (let e = 0; e < 8; e++) {
        const notes = shapes[e < 4 || shapes.length === 1 ? 0 : 1];
        const m = midi(notes[order[e]]) + 12;
        const vol = (b >= 8 ? 0.07 : 0.04) * (e % 2 ? 0.7 : 1);
        const at = Math.round((t0 + e * (beat / 2)) * RATE);
        const x = tone(0.6, mtof(m), { shape: 'tri', attack: 0.003, decay: 0.18, vol });
        for (let i = 0; i < x.length; i++) put(bed, at + i, x[i]);
      }
    }
    // Lead melody: a soft quarter-duty pulse with a little vibrato.
    const steps = melody[b].split(' ');
    for (let e = 0; e < 8; e++) {
      if (steps[e] === '-' || steps[e] === '.') continue;
      let len = 1;
      while (e + len < 8 && steps[e + len] === '-') len++;
      voice(lead, midi(steps[e]), t0 + e * (beat / 2), len * (beat / 2) * 0.92, {
        shape: leadShape,
        vol: 0.2,
        attack: 0.02,
        release: 0.35,
        cutoff: 1100,
        vibrato: 0.006,
      });
    }
    // Light percussion: brushy hats always, soft kick and snap from bar 5.
    for (let e = 0; e < 8; e++) {
      const at = Math.round((t0 + e * (beat / 2)) * RATE);
      const hat = biquad(
        noiseBurst(0.06, (t) => Math.exp(-t / 0.012)),
        'hp',
        7000,
      );
      for (let i = 0; i < hat.length; i++) put(bed, at + i, hat[i] * (e % 2 ? 0.015 : 0.008));
    }
    if (drive || b >= 4) {
      for (const k of drive ? [0, 1, 2, 3] : [0, 2]) {
        const kick = tone(0.3, (t) => 45 + 70 * Math.exp(-t / 0.03), {
          attack: 0.002,
          decay: 0.09,
          vol: 0.4,
        });
        const at = Math.round((t0 + k * beat) * RATE);
        for (let i = 0; i < kick.length; i++) put(bed, at + i, kick[i]);
      }
      for (const k of [1, 3]) {
        const snap = biquad(
          noiseBurst(0.15, (t) => Math.exp(-t / 0.035)),
          'bp',
          1800,
          0.8,
        );
        const at = Math.round((t0 + k * beat) * RATE);
        for (let i = 0; i < snap.length; i++) put(bed, at + i, snap[i] * 0.04);
      }
    }
  }

  // Dotted-eighth echo on the lead, run round the loop twice so the echo tail wraps too.
  const d = Math.round(beat * 0.75 * RATE);
  const wet = new Float32Array(L);
  for (let pass = 0; pass < 2; pass++)
    for (let i = 0; i < L; i++) wet[i] = lead[(i - d + L) % L] * 0.35 + wet[(i - d + L) % L] * 0.4;
  const out = new Float32Array(L);
  for (let i = 0; i < L; i++) out[i] = bed[i] + lead[i] + wet[i] * 0.6;
  return normalize(out, 0.22);
}

// ── Footsteps ────────────────────────────────────────────────────────────────

/** Noise chopped into little random grains: crunch and rustle. */
function grains(seconds, density, grainMs, env) {
  const x = buf(seconds);
  const g = Math.round((grainMs / 1000) * RATE);
  for (let i = 0; i < x.length; i++) {
    if (rand() < density / RATE) {
      const amp = 0.4 + rand() * 0.6;
      for (let k = 0; k < g && i + k < x.length; k++)
        x[i + k] += noise() * amp * Math.exp(-k / (g / 3)) * env((i + k) / RATE);
    }
  }
  return x;
}

const STEPS = {
  grass: () => {
    const x = grains(0.18, 900, 6, (t) => Math.min(1, t / 0.015) * Math.exp(-t / 0.05));
    biquad(x, 'bp', 3200 + rand() * 1500, 0.6);
    return mix(
      x,
      biquad(
        noiseBurst(0.08, (t) => Math.exp(-t / 0.02)),
        'lp',
        500,
      ),
      0,
      0.3,
    );
  },
  dirt: () => {
    const x = biquad(
      noiseBurst(0.14, (t) => Math.min(1, t / 0.012) * Math.exp(-t / 0.03)),
      'lp',
      700 + rand() * 300,
    );
    // No low thump tone here: on top of the crunch it read as someone knocking.
    return mix(
      x,
      biquad(
        grains(0.1, 300, 4, (t) => Math.exp(-t / 0.03)),
        'bp',
        1500,
        0.8,
      ),
      0,
      0.4,
    );
  },
  stone: () => {
    const f = 1700 + rand() * 600;
    const x = biquad(
      noiseBurst(0.08, (t) => Math.exp(-t / 0.008)),
      'bp',
      f,
      1.5,
    );
    mix(x, tone(0.08, f * 0.6, { decay: 0.012, vol: 0.25 }));
    return mix(
      x,
      biquad(
        noiseBurst(0.08, (t) => Math.exp(-t / 0.015)),
        'lp',
        400,
      ),
      0,
      0.5,
    );
  },
  // A soft shoe on floorboards: a muffled scuff and a faint board creak. No tuned tones,
  // which is what made the old wood step sound like knuckles on a door.
  wood: () => {
    const x = biquad(
      noiseBurst(0.14, (t) => Math.min(1, t / 0.012) * Math.exp(-t / 0.035)),
      'lp',
      900 + rand() * 300,
    );
    return mix(
      x,
      biquad(
        noiseBurst(0.12, (t) => Math.min(1, t / 0.02) * Math.exp(-t / 0.04)),
        'bp',
        450 + rand() * 120,
        3,
      ),
      0,
      0.5,
    );
  },
  sand: () => {
    const x = grains(0.22, 1400, 5, (t) => Math.min(1, t / 0.03) * Math.exp(-t / 0.06));
    biquad(x, 'lp', 2200 + rand() * 600);
    return biquad(x, 'hp', 300);
  },
  water: () => {
    const x = biquad(
      noiseBurst(0.3, (t) => Math.min(1, t / 0.01) * Math.exp(-t / 0.07)),
      'bp',
      (i) => 900 + 1800 * Math.exp(-i / RATE / 0.05),
      1.2,
    );
    for (let k = 0; k < 3; k++) {
      const f0 = 500 + rand() * 600;
      mix(
        x,
        tone(0.06, (t) => f0 * (1 + t * 25), { attack: 0.003, decay: 0.015, vol: 0.25 }),
        0.03 + rand() * 0.12,
      );
    }
    return x;
  },
};

// ── One-shots ────────────────────────────────────────────────────────────────

/** A soft bell: a sine with a quieter octave and fifth partial. */
const bell = (f, decay = 0.4, vol = 1) => {
  const x = tone(decay * 4, f, { attack: 0.004, decay, vol });
  mix(x, tone(decay * 4, f * 2, { attack: 0.004, decay: decay / 2, vol: vol * 0.3 }));
  return mix(x, tone(decay * 4, f * 3.01, { attack: 0.004, decay: decay / 4, vol: vol * 0.1 }));
};

const SFX = {
  click: () => {
    const x = tone(0.05, 1300, { shape: 'pulse', decay: 0.01, vol: 0.5 });
    return biquad(x, 'lp', 4000);
  },
  'talk-blip': () =>
    biquad(
      tone(0.06, (t) => 620 - 600 * t, { shape: 'pulse', attack: 0.003, decay: 0.02, vol: 0.6 }),
      'lp',
      3000,
    ),
  'chest-open': () => {
    const x = buf(1.3);
    // A wooden creak: a buzzy low saw wobbling in pitch, then the lid's knock.
    const creak = biquad(
      tone(0.28, (t) => 110 + 40 * Math.sin(TAU * 9 * t) + 80 * t, {
        shape: 'saw',
        attack: 0.03,
        decay: 0.2,
        vol: 0.4,
      }),
      'bp',
      900,
      1.5,
    );
    mix(x, creak);
    mix(x, STEPS.wood(), 0.26, 0.8);
    // Then a sparkle up the chord.
    ['C6', 'E6', 'G6', 'C7'].forEach((n, k) =>
      mix(x, bell(mtof(midi(n)), 0.18, 0.35), 0.34 + k * 0.07),
    );
    return x;
  },
  success: () => {
    const x = buf(1.8);
    // A warm hum swelling up, as a lamp warms, then a bright chord rings out on top.
    mix(
      x,
      biquad(
        noiseBurst(0.6, (t) => (t / 0.6) ** 2 * 0.2),
        'bp',
        (i) => 300 + 2500 * (i / RATE / 0.6),
        2,
      ),
    );
    ['C5', 'E5', 'G5'].forEach((n, k) => mix(x, bell(mtof(midi(n)), 0.25, 0.4), 0.1 + k * 0.08));
    for (const n of ['C5', 'G5', 'C6', 'E6']) mix(x, bell(mtof(midi(n)), 0.35, 0.3), 0.42);
    return x;
  },
  fail: () => {
    const x = buf(0.7);
    mix(x, tone(0.3, mtof(midi('E4')), { shape: 'tri', attack: 0.01, decay: 0.12, vol: 0.5 }));
    mix(
      x,
      tone(0.45, (t) => mtof(midi('C4')) * (1 - 0.06 * t), {
        shape: 'tri',
        attack: 0.01,
        decay: 0.16,
        vol: 0.5,
      }),
      0.17,
    );
    return biquad(x, 'lp', 1800);
  },
  'rock-push': () => {
    const x = buf(0.55);
    // Grinding: low noise with a stuttering scrape, ending in a thud.
    const grind = noiseBurst(
      0.45,
      (t) =>
        Math.min(1, t / 0.05) *
        (0.6 + 0.4 * Math.sin(TAU * 23 * t)) *
        (t < 0.35 ? 1 : Math.exp(-(t - 0.35) / 0.03)),
    );
    mix(x, biquad(biquad(grind, 'lp', 450), 'hp', 60));
    mix(
      x,
      tone(0.2, (t) => 55 + 50 * Math.exp(-t / 0.02), { decay: 0.06, vol: 0.9 }),
      0.33,
    );
    return x;
  },
};

// ── Write everything ─────────────────────────────────────────────────────────

mkdirSync(OUT, { recursive: true });
writeWav('music-town', music());
for (const [surface, make] of Object.entries(STEPS))
  for (let v = 1; v <= 3; v++)
    writeWav(`step-${surface}-${v}`, normalize(edges(make()), surface === 'water' ? 0.22 : 0.16));
const LOUD = {
  click: 0.35,
  'talk-blip': 0.3,
  'chest-open': 0.6,
  success: 0.65,
  fail: 0.5,
  'rock-push': 0.5,
};
for (const [name, make] of Object.entries(SFX))
  writeWav(name, normalize(edges(make()), LOUD[name]));

// ── Boss music: "Grumble's March", a pushy 8-bar D minor loop ────────────────
// Written last so the shared random stream, and so every older sound, comes out unchanged.
const BOSS_CHORDS = [
  ['D2', ['D3', 'F3', 'A3', 'D4']],
  ['D2', ['D3', 'F3', 'A3', 'C4']],
  ['Bb1', ['D3', 'F3', 'Bb3', 'D4']],
  ['A1', ['C#3', 'E3', 'A3', 'C#4']],
  ['D2', ['D3', 'F3', 'A3', 'D4']],
  ['G1', ['D3', 'G3', 'Bb3', 'D4']],
  ['Bb1', ['D3', 'F3', 'Bb3', 'D4']],
  ['A1', ['C#3', 'E3', 'G3', 'A3']],
];
const BOSS_MELODY = [
  'D5 . F5 . A5 - G5 F5',
  'E5 . D5 . C#5 - . .',
  'D5 . F5 . Bb5 - A5 G5',
  'A5 - - - E5 - C#5 -',
  'D5 . D5 F5 A5 . D6 .',
  'C6 - Bb5 - G5 - . .',
  'F5 . G5 . A5 . Bb5 .',
  'A5 - - - C#5 - E5 -',
];
writeWav('music-boss', music({ bpm: 132, chords: BOSS_CHORDS, melody: BOSS_MELODY, leadShape: 'pulse', drive: true }));
