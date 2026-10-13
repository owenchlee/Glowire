// The whole 3D diorama: camera, lights, floating board, tiles, current flow and effects.

import { Canvas, useFrame, useThree } from './r3f';
import { type RefObject, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { StyleSheet } from 'react-native';
import {
  type Group,
  type Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  type OrthographicCamera,
  Plane,
  Raycaster,
  Vector2,
  Vector3,
} from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

import type { BoardState } from '../board/board';
import type { SimulationResult } from '../engine';
import { currentSkin, getAssets } from './assets';
import { AnimatedTile } from './AnimatedTile';
import { FlowParticles } from './FlowParticles';
import { cellToWorld, TOP, worldToCell } from './layout';
import { COLORS } from './theme';
import { TileModel } from './TileModel';

import type { GhostPreview, ScenePicker } from '../puzzle-view/types';
import { Backdrop, type BackdropSpec } from './Backdrop';

export type { GhostPreview, ScenePicker };

/** 'iso': isometric diorama. 'top': near top-down with a slight tilt (flatter, easier taps). */
export type CameraView = 'iso' | 'top';


interface Props {
  board: BoardState;
  result: SimulationResult;
  ghost: GhostPreview | null;
  /** Tile id hidden while the player drags it around. */
  draggingId: number | null;
  shake: { id: number; key: number };
  celebrateKey: number;
  /** Where the celebration burst goes (a lit LED, or the board centre). */
  celebrateCell: number;
  pickerRef: RefObject<ScenePicker | null>;
  onReady: () => void;
  view?: CameraView;
  /** The job's street, drawn at night behind the floating board. */
  backdrop?: BackdropSpec | null;
}

export function BoardCanvas(props: Props) {
  return (
    <Canvas
      style={StyleSheet.absoluteFill}
      orthographic
      camera={{ position: [10, 10, 10], zoom: 60, near: 0.1, far: 100 }}
    >
      <color attach="background" args={[props.backdrop ? '#0d0f1e' : currentSkin().board.backdrop]} />
      <Scene {...props} />
    </Canvas>
  );
}

function Scene({
  board,
  result,
  ghost,
  draggingId,
  shake,
  celebrateKey,
  celebrateCell,
  pickerRef,
  onReady,
  view = 'top',
  backdrop,
}: Props) {
  const night = !!backdrop;
  return (
    <>
      <CameraRig board={board} pickerRef={pickerRef} onReady={onReady} view={view} />
      {backdrop && <Backdrop spec={backdrop} boardWidth={board.width} />}
      {night ? (
        <>
          {/* Night on the street: cool moonlight from above, a warm work lamp from the front. */}
          <hemisphereLight args={['#b9c4ff', '#4a3d6b', 0.85]} />
          <directionalLight position={[-3, 8, 6]} intensity={1.6} color="#ffe2b0" />
          <directionalLight position={[5, 6, -4]} intensity={0.5} color="#8fa2ff" />
          <ambientLight intensity={0.18} />
        </>
      ) : (
        <>
          <hemisphereLight args={['#fff7ee', '#cbbbe6', 1.1]} />
          <directionalLight position={[4, 9, 3]} intensity={1.7} />
          <ambientLight intensity={0.25} />
        </>
      )}
      <BoardBase board={board} highlight={ghost?.cell ?? null} />
      {board.cells.map((placed, cell) => {
        if (!placed) return null;
        const [x, z] = cellToWorld(cell, board.width, board.height);
        return (
          <AnimatedTile
            key={placed.id}
            placed={placed}
            x={x}
            z={z}
            result={result.tiles[cell] ?? null}
            shakeKey={shake.id === placed.id ? shake.key : 0}
            hidden={placed.id === draggingId}
          />
        );
      })}
      {ghost && <Ghost board={board} ghost={ghost} />}
      <FlowParticles board={board} result={result} />
      <ShortCircuitPulse />
      {celebrateKey > 0 && (
        <Celebration
          key={celebrateKey}
          position={cellToWorld(celebrateCell, board.width, board.height)}
        />
      )}
    </>
  );
}

/** Orthographic camera that fits the board to the screen, plus picking. */
function CameraRig({
  board,
  pickerRef,
  onReady,
  view,
}: {
  board: BoardState;
  pickerRef: RefObject<ScenePicker | null>;
  onReady: () => void;
  view: CameraView;
}) {
  const camera = useThree((s) => s.camera) as OrthographicCamera;
  const size = useThree((s) => s.size);

  useLayoutEffect(() => {
    // Set the frame from the canvas size here (R3F does too, but possibly later), so the
    // picker below never projects with a stale camera after a resize.
    camera.left = -size.width / 2;
    camera.right = size.width / 2;
    camera.top = size.height / 2;
    camera.bottom = -size.height / 2;
    if (view === 'iso') {
      // True isometric: equal angles to all three axes, looking at the board centre.
      camera.position.set(10, 10, 10);
      camera.lookAt(0, 0, 0);
      const diagonal = Math.hypot(board.width, board.height);
      // Fit the board's diamond (width) and its projected height, leaving some margin.
      camera.zoom = Math.min(size.width / (diagonal + 1.4), size.height / (diagonal * 0.6 + 2.2));
    } else {
      // Looking down from 25° off vertical: square cells, but tiles still show their height.
      const tilt = (25 * Math.PI) / 180;
      camera.position.set(0, 10 * Math.cos(tilt), 10 * Math.sin(tilt));
      camera.lookAt(0, 0, 0);
      camera.zoom = Math.min(
        size.width / (board.width + 0.9),
        size.height / (board.height * Math.cos(tilt) + 1.6),
      );
    }
    camera.updateProjectionMatrix();

    const raycaster = new Raycaster();
    const plane = new Plane(new Vector3(0, 1, 0), -TOP);
    const hit = new Vector3();
    pickerRef.current = {
      cellAt(x, y) {
        const ndc = new Vector2((x / size.width) * 2 - 1, -(y / size.height) * 2 + 1);
        raycaster.setFromCamera(ndc, camera);
        if (!raycaster.ray.intersectPlane(plane, hit)) return null;
        return worldToCell(hit.x, hit.z, board.width, board.height);
      },
      project(cell, height = TOP + 0.5) {
        const [wx, wz] = cellToWorld(cell, board.width, board.height);
        const v = new Vector3(wx, height, wz).project(camera);
        return { x: ((v.x + 1) / 2) * size.width, y: ((1 - v.y) / 2) * size.height };
      },
    };
    onReady();
  }, [camera, size.width, size.height, board.width, board.height, pickerRef, onReady, view]);

  // R3F can still adjust the camera after that effect (on web, around a resize). Check each
  // frame and tell the 2D overlay again if the view really moved, so value tags never stick
  // to stale spots.
  const seen = useRef('');
  useFrame(() => {
    camera.updateMatrixWorld();
    const e = camera.projectionMatrix.elements;
    const w = camera.matrixWorld.elements;
    const key = `${e[0]},${e[5]},${e[12]},${e[13]},${w[12]},${w[13]},${w[14]}`;
    if (key === seen.current) return;
    const first = seen.current === '';
    seen.current = key;
    if (!first) onReady();
  });

  return null;
}

function BoardBase({ board, highlight }: { board: BoardState; highlight: number | null }) {
  const { geometry: g, material: m } = getAssets();
  const slab = useMemo(
    () => ({
      geometry: new RoundedBoxGeometry(board.width + 0.35, 0.45, board.height + 0.35, 4, 0.16),
      top: new MeshStandardMaterial({ color: currentSkin().board.side, roughness: 0.9 }),
      blob: new MeshBasicMaterial({
        color: COLORS.shadow,
        alphaMap: getAssets().glowTexture,
        transparent: true,
        opacity: 0.22,
        depthWrite: false,
      }),
    }),
    [board.width, board.height],
  );
  useEffect(
    () => () => {
      slab.geometry.dispose();
      slab.top.dispose();
      slab.blob.dispose();
    },
    [slab],
  );

  const float = useRef<Group>(null);
  return (
    <group ref={float}>
      {/* Soft shadow far below so the board looks like it floats. */}
      <mesh
        geometry={g.cell}
        material={slab.blob}
        position-y={-1.3}
        scale={[board.width * 1.7, 1, board.height * 1.7]}
      />
      <mesh geometry={slab.geometry} material={slab.top} position-y={-0.225} />
      {board.cells.map((_, cell) => {
        const [x, z] = cellToWorld(cell, board.width, board.height);
        const checker = (Math.floor(cell / board.width) + (cell % board.width)) % 2 === 0;
        return (
          <mesh
            key={cell}
            geometry={g.cell}
            material={cell === highlight ? m.cellHighlight : checker ? m.cellA : m.cellB}
            position={[x, 0.001, z]}
          />
        );
      })}
    </group>
  );
}

function Ghost({ board, ghost }: { board: BoardState; ghost: GhostPreview }) {
  const ref = useRef<Group>(null);
  const [x, z] = cellToWorld(ghost.cell, board.width, board.height);
  useFrame(({ clock }) => {
    if (ref.current) ref.current.position.y = 0.12 + 0.04 * Math.sin(clock.elapsedTime * 6);
  });
  return (
    <group ref={ref} position={[x, 0.12, z]} rotation-y={(-ghost.tile.rotation * Math.PI) / 2}>
      <TileModel tile={ghost.tile} result={null} ghost />
    </group>
  );
}

/** Pulse the shared short-circuit material so every shorted wire flashes in sync. */
function ShortCircuitPulse() {
  useFrame(({ clock }) => {
    const pulse = 0.5 + 0.5 * Math.sin(clock.elapsedTime * 10);
    getAssets().material.wireShort.emissiveIntensity = 0.3 + 1.2 * pulse;
  });
  return null;
}

/** Deterministic 0–1 noise, so render stays pure. */
function jitter(i: number, k: number): number {
  const v = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453;
  return v - Math.floor(v);
}

const CONFETTI = ['#ff8fa3', '#ffd56b', '#8fd6b4', '#9db8ff', '#c9a7ff', '#ffb27a'];

/** A one-shot burst of colourful bits over the LED the first time it lights. */
function Celebration({ position: [x, z] }: { position: [number, number] }) {
  const { geometry: g } = getAssets();
  const group = useRef<Group>(null);
  const start = useRef(-1);
  const bits = useMemo(
    () =>
      Array.from({ length: 18 }, (_, i) => ({
        material: new MeshBasicMaterial({
          color: CONFETTI[i % CONFETTI.length],
          transparent: true,
        }),
        angle: (i / 18) * Math.PI * 2 + jitter(i, 1) * 0.3,
        speed: 1.2 + jitter(i, 2) * 0.9,
        lift: 2.2 + jitter(i, 3) * 1.2,
      })),
    [],
  );
  useEffect(() => () => bits.forEach((b) => b.material.dispose()), [bits]);

  useFrame(({ clock }) => {
    if (start.current < 0) start.current = clock.elapsedTime;
    const t = clock.elapsedTime - start.current;
    const grp = group.current;
    if (!grp) return;
    grp.visible = t < 1.6;
    grp.children.forEach((child, i) => {
      const b = bits[i]!;
      const r = b.speed * t;
      (child as Mesh).position.set(
        Math.cos(b.angle) * r,
        TOP + 0.3 + b.lift * t - 2.6 * t * t,
        Math.sin(b.angle) * r,
      );
      b.material.opacity = Math.max(0, 1 - t / 1.6);
    });
  });

  return (
    <group ref={group} position={[x, 0, z]}>
      {bits.map((b, i) => (
        <mesh key={i} geometry={g.puff} material={b.material} scale={0.55} />
      ))}
    </group>
  );
}
