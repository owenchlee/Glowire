// Music and sound effects. Fire-and-forget: every call fails silently if sound can't play.
// Sounds are made by scripts/audio-art.mjs, levels baked in (so nothing sets volume, which
// iOS Safari ignores anyway).

import { type AudioPlayer, createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { Platform } from 'react-native';

import type { Surface } from './surface';

export type { Surface } from './surface';
export type SfxName = 'chest-open' | 'click' | 'success' | 'fail' | 'talk-blip' | 'rock-push';

const MUSIC = {
  town: require('../../assets/audio/music-town.mp3'),
  boss: require('../../assets/audio/music-boss.mp3'),
};
export type Track = keyof typeof MUSIC;
let track: Track = 'town';
const SFX: Record<SfxName, number> = {
  'chest-open': require('../../assets/audio/chest-open.mp3'),
  click: require('../../assets/audio/click.wav'),
  success: require('../../assets/audio/success.mp3'),
  fail: require('../../assets/audio/fail.mp3'),
  'talk-blip': require('../../assets/audio/talk-blip.wav'),
  'rock-push': require('../../assets/audio/rock-push.mp3'),
};
const STEPS: Record<Surface, number[]> = {
  grass: [
    require('../../assets/audio/step-grass-1.wav'),
    require('../../assets/audio/step-grass-2.wav'),
    require('../../assets/audio/step-grass-3.wav'),
  ],
  dirt: [
    require('../../assets/audio/step-dirt-1.wav'),
    require('../../assets/audio/step-dirt-2.wav'),
    require('../../assets/audio/step-dirt-3.wav'),
  ],
  stone: [
    require('../../assets/audio/step-stone-1.wav'),
    require('../../assets/audio/step-stone-2.wav'),
    require('../../assets/audio/step-stone-3.wav'),
  ],
  wood: [
    require('../../assets/audio/step-wood-1.wav'),
    require('../../assets/audio/step-wood-2.wav'),
    require('../../assets/audio/step-wood-3.wav'),
  ],
  sand: [
    require('../../assets/audio/step-sand-1.mp3'),
    require('../../assets/audio/step-sand-2.mp3'),
    require('../../assets/audio/step-sand-3.mp3'),
  ],
  water: [
    require('../../assets/audio/step-water-1.mp3'),
    require('../../assets/audio/step-water-2.mp3'),
    require('../../assets/audio/step-water-3.mp3'),
  ],
};
/** Shortest time between footsteps: calling playStep every frame gives about 3.5 steps a second. */
const STEP_GAP_MS = 280;

let muted = false;
let wantMusic = false;
let lastStep = 0;
let lastVariant = -1;
const players = new Map<number, AudioPlayer>();

// Respect the iOS silent switch, and let the player's own music keep playing underneath.
if (Platform.OS !== 'web')
  setAudioModeAsync({ playsInSilentMode: false, interruptionMode: 'mixWithOthers' }).catch(
    () => {},
  );

/** One player per sound, made the first time it's needed (null if audio isn't available). */
function player(source: number): AudioPlayer | null {
  try {
    let p = players.get(source);
    if (!p) players.set(source, (p = createAudioPlayer(source)));
    return p;
  } catch {
    return null;
  }
}

/**
 * Browsers refuse to play before the first tap or key press, and expo-audio's web player
 * leaves that refusal as an unhandled promise rejection; so don't try until the page has had one.
 */
function unlocked(): boolean {
  if (Platform.OS !== 'web') return true;
  const nav = globalThis.navigator as
    (Navigator & { userActivation?: { hasBeenActive: boolean } }) | undefined;
  return nav?.userActivation?.hasBeenActive !== false; // shortcut: browsers without userActivation are assumed unlocked
}

/** Play from the start, cutting off the sound if it's still going. */
function fire(source: number) {
  if (muted || !unlocked()) return;
  const p = player(source);
  if (!p) return;
  try {
    p.seekTo(0)
      .then(() => p.play())
      .catch(() => {});
  } catch {}
}

function playMusicNow() {
  if (!wantMusic || muted) return;
  const p = player(MUSIC[track]);
  if (!p) return;
  try {
    p.loop = true;
    p.play();
  } catch {}
}

let waiting = false;
/** On web before any gesture: start the music on the first key or tap instead. */
function startOnFirstGesture() {
  if (waiting || typeof window === 'undefined') return;
  waiting = true;
  const EVENTS = ['keydown', 'pointerdown', 'touchend'] as const;
  const go = () => {
    for (const type of EVENTS) window.removeEventListener(type, go, true);
    waiting = false;
    playMusicNow();
  };
  for (const type of EVENTS) window.addEventListener(type, go, true);
}

/** Start (or resume) a looping theme, switching off the other one. Safe to call repeatedly. */
export function startMusic(next: Track = 'town'): void {
  if (next !== track) {
    try {
      players.get(MUSIC[track])?.pause();
    } catch {}
    track = next;
  }
  wantMusic = true;
  if (unlocked()) playMusicNow();
  else startOnFirstGesture();
}

/** Stop the music (it resumes where it left off on the next startMusic). */
export function stopMusic(): void {
  wantMusic = false;
  try {
    players.get(MUSIC[track])?.pause();
  } catch {}
}

/** Mute or unmute everything. Music started while muted begins once unmuted. */
export function setMuted(m: boolean): void {
  muted = m;
  if (m) {
    stopVoice();
    try {
      players.get(MUSIC[track])?.pause();
    } catch {}
  } else if (unlocked()) playMusicNow();
  else if (wantMusic) startOnFirstGesture();
}

export function isMuted(): boolean {
  return muted;
}

/** Play a one-shot sound effect. */
export function playSfx(name: SfxName): void {
  fire(SFX[name]);
}

/**
 * A footstep on this surface. Call it every frame while the hero walks: it plays at most
 * one step every STEP_GAP_MS, picking a variant different from the last one.
 */
export function playStep(surface: Surface): void {
  const now = Date.now();
  if (now - lastStep < STEP_GAP_MS) return;
  lastStep = now;
  const list = STEPS[surface];
  let v = Math.floor(Math.random() * (list.length - 1));
  if (v >= lastVariant) v++; // skip the one just played
  lastVariant = v % list.length;
  fire(list[lastVariant]!);
}

let voice: AudioPlayer | null = null;

/** Speak a recorded line of dialog, cutting off whatever line was playing. */
export function playVoice(source: number): void {
  stopVoice();
  if (muted || !unlocked()) return;
  try {
    voice = createAudioPlayer(source);
    voice.play();
  } catch {
    voice = null;
  }
}

/** Stop the line being spoken (and free its player: there are hundreds of lines). */
export function stopVoice(): void {
  try {
    voice?.remove();
  } catch {}
  voice = null;
}
