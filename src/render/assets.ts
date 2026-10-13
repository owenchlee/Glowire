// Geometries, materials and textures shared by every tile. Created once and reused,
// so 25 tiles cost a handful of GPU buffers instead of hundreds.

import {
  AdditiveBlending,
  BoxGeometry,
  CapsuleGeometry,
  Color,
  CylinderGeometry,
  DataTexture,
  type Material,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  RGBAFormat,
  SphereGeometry,
  SpriteMaterial,
} from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

import type { LedColor } from '../engine';
import { BAND_COLORS, COLORS, LED_PALETTE } from './theme';
import { BASE_HEIGHT } from './layout';

/** Soft round alpha falloff, generated in JS (no image files, no canvas needed). */
function radialTexture(size = 64, power = 2): DataTexture {
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (x + 0.5) / size - 0.5;
      const dy = (y + 0.5) / size - 0.5;
      const r = Math.min(1, Math.sqrt(dx * dx + dy * dy) * 2);
      const i = (y * size + x) * 4;
      // The falloff goes in every channel: as a `map` the alpha fades it, and as an
      // `alphaMap` three.js reads the green channel (white there drew hard-edged squares).
      const v = Math.round(255 * Math.pow(1 - r, power));
      data[i] = data[i + 1] = data[i + 2] = data[i + 3] = v;
    }
  }
  const tex = new DataTexture(data, size, size, RGBAFormat);
  tex.needsUpdate = true;
  return tex;
}

const soft = (color: string, extra: Partial<MeshStandardMaterial> = {}) =>
  new MeshStandardMaterial({ color, roughness: 0.85, metalness: 0, ...extra });

function create() {
  const glowTexture = radialTexture(64, 2.2);
  const shadowTexture = radialTexture(64, 1.3);

  const geometry = {
    base: new RoundedBoxGeometry(0.9, BASE_HEIGHT, 0.9, 3, 0.07),
    arm: new BoxGeometry(0.15, 0.08, 0.5),
    joint: new CylinderGeometry(0.075, 0.075, 0.08, 16),
    contactShadow: new PlaneGeometry(1.25, 1.25).rotateX(-Math.PI / 2),
    cell: new PlaneGeometry(0.96, 0.96).rotateX(-Math.PI / 2),
    plusBar: new BoxGeometry(0.13, 0.025, 0.035),
    rivet: new CylinderGeometry(0.03, 0.03, 0.02, 8),
    ledRim: new CylinderGeometry(0.21, 0.21, 0.07, 24),
    ledDome: new SphereGeometry(0.19, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2),
    crack: new BoxGeometry(0.015, 0.01, 0.2),
    resistorBody: new CapsuleGeometry(0.11, 0.3, 6, 16).rotateZ(Math.PI / 2),
    resistorBand: new CylinderGeometry(0.118, 0.118, 0.04, 16).rotateZ(Math.PI / 2),
    batteryBody: new CylinderGeometry(0.2, 0.2, 0.56, 24).rotateZ(Math.PI / 2),
    batteryCap: new CylinderGeometry(0.205, 0.205, 0.1, 24).rotateZ(Math.PI / 2),
    batteryNub: new CylinderGeometry(0.07, 0.07, 0.06, 16).rotateZ(Math.PI / 2),
    particle: new SphereGeometry(0.045, 8, 6),
    puff: new SphereGeometry(0.09, 10, 8),
    switchPost: new CylinderGeometry(0.06, 0.07, 0.12, 12),
    lever: new BoxGeometry(0.5, 0.05, 0.09).translate(0.25, 0, 0),
    knob: new SphereGeometry(0.075, 12, 10),
    blockBody: new RoundedBoxGeometry(0.84, 0.42, 0.84, 3, 0.1),
    bush: new SphereGeometry(0.17, 14, 10),
  };

  const wireLevels = [0, 0.3, 0.55, 0.8, 1.1].map((intensity) =>
    soft(COLORS.wire, { emissive: new Color(COLORS.wireGlow), emissiveIntensity: intensity }),
  );

  const material = {
    base: {
      wire: soft(COLORS.wireBase),
      resistor: soft(COLORS.resistorBase),
      led: soft(COLORS.ledBase),
      battery: soft(COLORS.batteryBase),
      switch: soft(COLORS.switchBase),
      block: soft(COLORS.blockStone),
    },
    bush: soft(COLORS.bush),
    switchOn: soft(COLORS.switchOn),
    switchOff: soft(COLORS.switchOff),
    cellA: soft(COLORS.cellA),
    cellB: soft(COLORS.cellB),
    cellHighlight: soft(COLORS.cellHighlight, { emissive: new Color(COLORS.cellHighlight) }),
    wireLevels,
    /** Shared by every shorted wire; the scene pulses its emissive colour. */
    wireShort: soft(COLORS.wire, { emissive: new Color(COLORS.shortGlow), emissiveIntensity: 1 }),
    marking: soft(COLORS.marking),
    markingLight: soft(COLORS.markingLight),
    rivet: soft(COLORS.lockedRivet),
    resistorBody: soft(COLORS.resistorBody),
    bands: BAND_COLORS.map((c) => soft(c)),
    batteryBody: soft(COLORS.batteryBody, { roughness: 0.55 }),
    batteryCap: soft(COLORS.batteryCap, { roughness: 0.4, metalness: 0.2 }),
    ledBurned: soft(COLORS.ledBurned, { roughness: 0.6 }),
    crack: new MeshBasicMaterial({ color: '#1e1a22' }),
    contactShadow: new MeshBasicMaterial({
      color: COLORS.shadow,
      alphaMap: shadowTexture,
      transparent: true,
      opacity: 0.32,
      depthWrite: false,
    }),
    particle: new MeshBasicMaterial({ color: '#ffffff', toneMapped: false }),
    ghost: new MeshBasicMaterial({
      color: '#ffffff',
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
    }),
  };

  return { geometry, material, glowTexture };
}

let assets: ReturnType<typeof create> | null = null;
export function getAssets() {
  return (assets ??= create());
}

/** Per-LED materials (brightness differs per LED, so these can't be shared). */
export function createLedMaterials(color: LedColor) {
  const palette = LED_PALETTE[color];
  const { glowTexture } = getAssets();
  return {
    dome: new MeshStandardMaterial({
      color: palette.lit,
      emissive: new Color(palette.lit),
      emissiveIntensity: 0,
      roughness: 0.25,
      transparent: true,
      opacity: 0.92,
    }),
    halo: new SpriteMaterial({
      map: glowTexture,
      color: palette.halo,
      blending: AdditiveBlending,
      transparent: true,
      depthWrite: false,
      opacity: 0,
      toneMapped: false,
    }),
  };
}

export function disposeMaterials(materials: Record<string, Material>) {
  for (const m of Object.values(materials)) m.dispose();
}

/** Colours a skin can change: wires, and the board under them. */
export interface Skin {
  wire: { color: string; glow: string };
  board: { side: string; cellA: string; cellB: string; backdrop: string };
}

const skin: Skin = {
  wire: { color: COLORS.wire, glow: COLORS.wireGlow },
  board: {
    side: COLORS.boardSide,
    cellA: COLORS.cellA,
    cellB: COLORS.cellB,
    backdrop: COLORS.background,
  },
};

/** The skin in use; the board scene reads it when it mounts. */
export function currentSkin(): Skin {
  return skin;
}

/** Recolour the shared materials, so every board from now on wears the new skin. */
export function applySkin(wire: Skin['wire'], board: Skin['board']) {
  skin.wire = { color: wire.color, glow: wire.glow };
  skin.board = { ...board };
  const { material: m } = getAssets();
  for (const level of m.wireLevels) {
    level.color.set(wire.color);
    level.emissive.set(wire.glow);
  }
  m.wireShort.color.set(wire.color);
  m.cellA.color.set(board.cellA);
  m.cellB.color.set(board.cellB);
}
