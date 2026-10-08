// Positions a tile on the board and animates it: springy 90° turns, a drop-in bounce
// when placed, a slide when moved, and a little shake for locked tiles.

import { useFrame } from '@react-three/fiber/native';
import { useRef } from 'react';
import type { Group } from 'three';

import type { PlacedTile } from '../board/board';
import type { TileResult } from '../engine';
import { getAssets } from './assets';
import { rotationAngle } from './layout';
import { TileModel } from './TileModel';

interface Props {
  placed: PlacedTile;
  x: number;
  z: number;
  result: TileResult | null;
  /** Changes each time the player pokes a locked tile. */
  shakeKey: number;
  hidden?: boolean;
}

const STIFFNESS = 260;
const DAMPING = 17; // a bit under critical (≈32) so turns overshoot slightly: springy

export function AnimatedTile({ placed, x, z, result, shakeKey, hidden = false }: Props) {
  const { geometry: g, material: m } = getAssets();
  const group = useRef<Group>(null);
  const turner = useRef<Group>(null);

  // Spring state lives in refs: animation never re-renders React.
  const s = useRef({
    angle: rotationAngle(placed.tile.rotation),
    targetAngle: rotationAngle(placed.tile.rotation),
    spin: 0,
    rotation: placed.tile.rotation,
    x,
    z,
    drop: 0.7, // height above the board; springs to 0
    dropV: 0,
    shakeKey,
    shakeStart: -1,
  }).current;

  if (placed.tile.rotation !== s.rotation) {
    // Always turn clockwise, even 3 → 0, by accumulating the target angle.
    const steps = (placed.tile.rotation - s.rotation + 4) % 4;
    s.targetAngle -= (steps * Math.PI) / 2;
    s.rotation = placed.tile.rotation;
  }
  if (shakeKey !== s.shakeKey) {
    s.shakeKey = shakeKey;
    s.shakeStart = -2;
  }

  useFrame(({ clock }, delta) => {
    const dt = Math.min(delta, 1 / 30);
    const t = clock.elapsedTime;
    s.spin += (STIFFNESS * (s.targetAngle - s.angle) - DAMPING * s.spin) * dt;
    s.angle += s.spin * dt;
    s.dropV += (STIFFNESS * -s.drop - DAMPING * s.dropV) * dt;
    s.drop += s.dropV * dt;
    const follow = 1 - Math.exp(-dt * 18);
    s.x += (x - s.x) * follow;
    s.z += (z - s.z) * follow;

    if (s.shakeStart === -2) s.shakeStart = t;
    const st = s.shakeStart < 0 ? 1 : (t - s.shakeStart) / 0.45;
    const shake = st < 1 ? Math.sin(st * Math.PI * 6) * 0.07 * (1 - st) : 0;

    if (group.current) group.current.position.set(s.x + shake, Math.max(-0.05, s.drop), s.z);
    if (turner.current) turner.current.rotation.y = s.angle;
  });

  return (
    <group ref={group} visible={!hidden}>
      <mesh
        geometry={g.contactShadow}
        material={m.contactShadow}
        position={[0.05, 0.004, 0.07]}
        renderOrder={-1}
      />
      <group ref={turner}>
        <TileModel tile={placed.tile} result={result} />
      </group>
    </group>
  );
}
