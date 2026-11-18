// Levels voice mp3s to -19 LUFS with a true-peak ceiling, in place (gain + limiter, re-encoded mp3).
//   node scripts/voice-level.mjs            every file in assets/voice
//   node scripts/voice-level.mjs a.mp3 ...  just those files
// voice.mjs imports levelFile() so new recordings come out level.
// Not idempotent in quality: each run re-encodes, so run it once per recording.
import { spawnSync } from 'node:child_process';
import { readdirSync, renameSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const TARGET = -19;

function ff(args) {
  const r = spawnSync('ffmpeg', ['-hide_banner', '-nostats', '-y', ...args], { encoding: 'utf8', maxBuffer: 1 << 26 });
  if (r.status !== 0) throw new Error(`ffmpeg ${args.join(' ')}: ${r.stderr.slice(-300)}`);
  return r.stderr;
}

function measure(file) {
  const err = ff(['-i', file, '-af', 'ebur128=peak=true', '-f', 'null', '-']);
  const last = (re) => Number(err.match(re).pop().match(/-?[\d.]+/)[0]);
  return { I: last(/I:\s+-?[\d.]+ LUFS/g), P: last(/Peak:\s+-?[\d.]+ dBFS/g) };
}

export function levelFile(file) {
  const tmp = file + '.tmp.mp3';
  let { I } = measure(file);
  let gain = TARGET - I;
  let ceil = -2.5; // dB; the 32 kbps re-encode adds a little peak, so the loop lowers this if needed
  for (let i = 0; i < 6; i++) {
    const lim = 10 ** (ceil / 20);
    ff(['-i', file, '-af', `volume=${gain}dB,alimiter=limit=${lim}:attack=2:release=40:level=disabled`, '-ar', '22050', '-ac', '1', '-c:a', 'libmp3lame', '-b:a', '32k', tmp]);
    const m = measure(tmp);
    const dI = TARGET - m.I;
    if (Math.abs(dI) <= 0.7 && m.P <= -1.3) break;
    if (m.P > -1.3) ceil -= m.P + 1.3 + 0.3;
    gain += dI;
  }
  renameSync(tmp, file);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const dir = new URL('../assets/voice/', import.meta.url).pathname.replace(/^\/(\w:)/, '$1');
  const files = process.argv.length > 2 ? process.argv.slice(2) : readdirSync(dir).filter((f) => f.endsWith('.mp3')).map((f) => dir + f);
  files.forEach((f, i) => { levelFile(f); if ((i + 1) % 100 === 0) console.log(`${i + 1}/${files.length}`); });
  console.log(`leveled ${files.length}`);
}
