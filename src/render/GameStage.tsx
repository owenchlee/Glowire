// A small floating 3D board for the brain games, lit and framed like the circuit puzzles so
// every game shares one look. The game draws each cell's pieces; taps come back as cells.

import { type ReactNode, useLayoutEffect, useMemo, useRef } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import {
  Color,
  CylinderGeometry,
  MeshBasicMaterial,
  MeshStandardMaterial,
  type OrthographicCamera,
  Plane,
  Raycaster,
  Vector2,
  Vector3,
} from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

import { currentSkin, getAssets } from './assets';
import { cellToWorld, TOP, worldToCell } from './layout';
import { COLORS } from './theme';
import { Canvas, useThree } from './r3f';

type CellAt = (x: number, y: number) => number | null;

export interface StageProps {
  cols: number;
  rows: number;
  /** The pieces standing on cell i (positioned for you). */
  cell: (i: number) => ReactNode;
  onPress?: (i: number) => void;
  /** Cells drawn lit up (e.g. picked). */
  highlight?: (i: number) => boolean;
  /** Spare room around the board, in cells (for pieces that stick out). */
  margin?: number;
  accessibilityLabel?: string;
}

export function GameStage({ cols, rows, cell, onPress, highlight, margin = 0, accessibilityLabel }: StageProps) {
  const picker = useRef<CellAt | null>(null);
  return (
    <View style={styles.fill}>
      <Canvas frameloop="demand" style={StyleSheet.absoluteFill} orthographic camera={{ position: [0, 10, 5], zoom: 60, near: 0.1, far: 100 }}>
        <hemisphereLight args={['#fff7ee', '#cbbbe6', 1.1]} />
        <directionalLight position={[4, 9, 3]} intensity={1.7} />
        <ambientLight intensity={0.25} />
        <Rig cols={cols} rows={rows} margin={margin} picker={picker} />
        <Slab cols={cols} rows={rows} highlight={highlight} />
        {Array.from({ length: cols * rows }, (_, i) => {
          const [x, z] = cellToWorld(i, cols, rows);
          return (
            <group key={i} position={[x, 0, z]}>
              {cell(i)}
            </group>
          );
        })}
      </Canvas>
      {onPress && (
        <Pressable
          style={StyleSheet.absoluteFill}
          accessibilityRole="button"
          accessibilityLabel={accessibilityLabel}
          onPress={(e) => {
            const i = picker.current?.(e.nativeEvent.locationX, e.nativeEvent.locationY);
            if (i !== null && i !== undefined) onPress(i);
          }}
        />
      )}
    </View>
  );
}

/** Same 25° tilt as the circuit board, zoomed to fill the space it has. */
function Rig({ cols, rows, margin, picker }: { cols: number; rows: number; margin: number; picker: { current: CellAt | null } }) {
  const camera = useThree((s) => s.camera) as OrthographicCamera;
  const size = useThree((s) => s.size);
  const invalidate = useThree((s) => s.invalidate);
  useLayoutEffect(() => {
    camera.left = -size.width / 2;
    camera.right = size.width / 2;
    camera.top = size.height / 2;
    camera.bottom = -size.height / 2;
    const tilt = (25 * Math.PI) / 180;
    camera.position.set(0, 10 * Math.cos(tilt), 10 * Math.sin(tilt));
    camera.lookAt(0, 0, 0);
    camera.zoom = Math.min(size.width / (cols + 0.9 + margin * 2), size.height / ((rows + margin * 2) * Math.cos(tilt) + 1.4));
    camera.updateProjectionMatrix();
    invalidate(); // demand loop: redraw after a refit
    const ray = new Raycaster();
    const plane = new Plane(new Vector3(0, 1, 0), -TOP);
    const hit = new Vector3();
    picker.current = (x, y) => {
      ray.setFromCamera(new Vector2((x / size.width) * 2 - 1, -(y / size.height) * 2 + 1), camera);
      return ray.ray.intersectPlane(plane, hit) ? worldToCell(hit.x, hit.z, cols, rows) : null;
    };
  }, [camera, invalidate, size.width, size.height, cols, rows, margin, picker]);
  return null;
}

function Slab({ cols, rows, highlight }: { cols: number; rows: number; highlight?: (i: number) => boolean }) {
  const { geometry: g, material: m } = getAssets();
  const slab = useMemo(
    () => ({
      geometry: new RoundedBoxGeometry(cols + 0.35, 0.45, rows + 0.35, 4, 0.16),
      top: new MeshStandardMaterial({ color: currentSkin().board.side, roughness: 0.9 }),
    }),
    [cols, rows],
  );
  return (
    <group>
      <mesh geometry={g.cell} material={stageMaterials().shadow} position-y={-1.3} scale={[cols * 1.7, 1, rows * 1.7]} />
      <mesh geometry={slab.geometry} material={slab.top} position-y={-0.225} />
      {Array.from({ length: cols * rows }, (_, i) => {
        const [x, z] = cellToWorld(i, cols, rows);
        const checker = (Math.floor(i / cols) + (i % cols)) % 2 === 0;
        return <mesh key={i} geometry={g.cell} material={highlight?.(i) ? m.cellHighlight : checker ? m.cellA : m.cellB} position={[x, 0.001, z]} />;
      })}
    </group>
  );
}

const soft = (color: string, extra: Partial<MeshStandardMaterial> = {}) => new MeshStandardMaterial({ color, roughness: 0.85, ...extra });

function createStage() {
  return {
    geometry: {
      clockFace: new CylinderGeometry(0.36, 0.38, 0.12, 32),
      clockRim: new CylinderGeometry(0.41, 0.41, 0.08, 32),
      hand: new RoundedBoxGeometry(0.06, 0.03, 1, 1, 0.01).translate(0, 0, -0.5),
      lampPost: new CylinderGeometry(0.05, 0.07, 0.7, 12),
      lampHead: new CylinderGeometry(0.2, 0.26, 0.12, 20),
    },
    material: {
      shadow: new MeshBasicMaterial({ color: COLORS.shadow, alphaMap: getAssets().glowTexture, transparent: true, opacity: 0.22, depthWrite: false }),
      clockOn: soft('#ffe166', { emissive: new Color('#ffd56b'), emissiveIntensity: 0.9 }),
      clockOff: soft('#4a4656'),
      rim: soft('#5b4e6e', { roughness: 0.5 }),
      handOn: soft('#2b2433'),
      handOff: soft('#8f84a6'),
      lampOn: soft('#fff3b8', { emissive: new Color('#ffd56b'), emissiveIntensity: 1.6 }),
      lampOff: soft('#6e6878'),
      lampDead: soft('#d14b34', { emissive: new Color('#d14b34'), emissiveIntensity: 0.6 }),
      lampClear: soft('#9fd4a8', { emissive: new Color('#7fb042'), emissiveIntensity: 0.35 }),
      lampMaybe: soft('#f2b36b', { emissive: new Color('#e8955a'), emissiveIntensity: 0.45 }),
      post: soft('#3a3546', { roughness: 0.5 }),
    },
  };
}

let stage: ReturnType<typeof createStage> | null = null;
export const stageAssets = () => (stage ??= createStage());
const stageMaterials = () => stageAssets().material;

const styles = StyleSheet.create({ fill: { flex: 1, alignSelf: 'stretch' } });
