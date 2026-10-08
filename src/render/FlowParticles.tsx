// Little lights that travel along wires in the direction of conventional current.
// One InstancedMesh for every particle on the board: a single draw call.

import { useFrame } from '@react-three/fiber/native';
import { useMemo, useRef } from 'react';
import { Color, type InstancedMesh, Object3D } from 'three';

import type { BoardState } from '../board/board';
import { type Direction, type SimulationResult } from '../engine';
import { getAssets } from './assets';
import { currentLevel } from './flow';
import { cellToWorld, DIR_VECTORS, TOP } from './layout';
import { COLORS } from './theme';

const MAX_PARTICLES = 400;

interface Arm {
  /** Start and end of the path in world space (x, z). */
  sx: number;
  sz: number;
  ex: number;
  ez: number;
  y: number;
  speed: number;
  count: number;
  scale: number;
  short: boolean;
}

export function FlowParticles({ board, result }: { board: BoardState; result: SimulationResult }) {
  const { geometry: g, material: m } = getAssets();
  const mesh = useRef<InstancedMesh>(null);
  const dummy = useMemo(() => new Object3D(), []);
  const colors = useMemo(
    () => ({ normal: new Color(COLORS.particle), short: new Color(COLORS.particleShort) }),
    [],
  );

  // Each tile port with current becomes an arm: edge → centre if current flows in,
  // centre → edge if it flows out. Consecutive arms chain into one moving stream.
  const arms = useMemo(() => {
    const list: Arm[] = [];
    result.tiles.forEach((t, cell) => {
      if (!t) return;
      const [cx, cz] = cellToWorld(cell, board.width, board.height);
      for (const [key, I] of Object.entries(t.portCurrents)) {
        const level = currentLevel(I);
        if (level === 0) continue;
        const [vx, vz] = DIR_VECTORS[Number(key) as Direction];
        const edge = [cx + vx * 0.5, cz + vz * 0.5] as const;
        const inward = I > 0;
        list.push({
          sx: inward ? edge[0] : cx,
          sz: inward ? edge[1] : cz,
          ex: inward ? cx : edge[0],
          ez: inward ? cz : edge[1],
          y: TOP + (t.kind === 'wire' ? 0.13 : 0.1),
          speed: 0.5 + 2.2 * level, // arm lengths per second
          count: 1 + Math.floor(level * 2.99),
          scale: 0.75 + 0.6 * level,
          short: t.status === 'SHORT_CIRCUIT',
        });
      }
    });
    return list;
  }, [board, result]);

  useFrame(({ clock }) => {
    const im = mesh.current;
    if (!im) return;
    const t = clock.elapsedTime;
    let n = 0;
    for (const arm of arms) {
      for (let k = 0; k < arm.count && n < MAX_PARTICLES; k++) {
        const p = (t * arm.speed + k / arm.count) % 1;
        dummy.position.set(arm.sx + (arm.ex - arm.sx) * p, arm.y, arm.sz + (arm.ez - arm.sz) * p);
        dummy.scale.setScalar(arm.scale);
        dummy.updateMatrix();
        im.setMatrixAt(n, dummy.matrix);
        im.setColorAt(n, arm.short ? colors.short : colors.normal);
        n++;
      }
    }
    im.count = n;
    im.instanceMatrix.needsUpdate = true;
    if (im.instanceColor) im.instanceColor.needsUpdate = true;
  });

  return (
    <instancedMesh
      ref={mesh}
      args={[g.particle, m.particle, MAX_PARTICLES]}
      frustumCulled={false}
      renderOrder={2}
    />
  );
}
