// One tile in its own local frame (rotation 0). AnimatedTile positions and turns it.

import { useFrame } from './r3f';
import { useEffect, useMemo, useRef } from 'react';
import { Color, type Group, type Material, MeshBasicMaterial, type Sprite } from 'three';

import { type Direction, type Tile, type TileResult, E, W, getPorts } from '../engine';
import { createLedMaterials, getAssets } from './assets';
import { currentLevel, perceivedGlow } from './flow';
import { BASE_HEIGHT, DIR_VECTORS, TOP } from './layout';
import { COLORS, resistorBandDigits } from './theme';

interface Props {
  tile: Tile;
  result: TileResult | null;
  ghost?: boolean;
}

export function TileModel({ tile, result, ghost = false }: Props) {
  const { geometry: g, material: m } = getAssets();
  const pick = (mat: Material) => (ghost ? m.ghost : mat);
  const wireMat = pick(wireMaterial(result));

  if (tile.kind === 'block') return <BlockModel />;

  return (
    <group>
      <mesh geometry={g.base} material={pick(m.base[tile.kind])} position-y={BASE_HEIGHT / 2} />
      {tile.locked && !ghost && tile.kind !== 'switch' && <Rivets />}
      {tile.kind === 'wire' && (
        <>
          {getPorts({ ...tile, rotation: 0 }).map((d) => (
            <Arm key={d} dir={d} material={wireMat} />
          ))}
          <mesh geometry={g.joint} material={wireMat} position-y={TOP + 0.04} />
        </>
      )}
      {tile.kind === 'resistor' && (
        <>
          <Arm dir={W} length={0.26} material={wireMat} />
          <Arm dir={E} length={0.26} material={wireMat} />
          <mesh geometry={g.resistorBody} material={pick(m.resistorBody)} position-y={TOP + 0.12} />
          {resistorBandDigits(tile.ohms).map((digit, i) => (
            <mesh
              key={i}
              geometry={g.resistorBand}
              material={pick(m.bands[digit]!)}
              position={[-0.12 + i * 0.08, TOP + 0.12, 0]}
            />
          ))}
        </>
      )}
      {tile.kind === 'battery' && (
        <>
          <Arm dir={W} length={0.18} material={wireMat} />
          <Arm dir={E} length={0.18} material={wireMat} />
          <mesh geometry={g.batteryBody} material={pick(m.batteryBody)} position-y={TOP + 0.21} />
          <mesh
            geometry={g.batteryCap}
            material={pick(m.batteryCap)}
            position={[-0.23, TOP + 0.21, 0]}
          />
          <mesh
            geometry={g.batteryNub}
            material={pick(m.batteryCap)}
            position={[-0.31, TOP + 0.21, 0]}
          />
          <Plus position={[-0.08, TOP + 0.415, 0]} material={pick(m.markingLight)} />
          <Minus position={[0.15, TOP + 0.415, 0]} material={pick(m.markingLight)} />
        </>
      )}
      {tile.kind === 'led' && <LedModel result={result} ghost={ghost} wireMat={wireMat} />}
      {tile.kind === 'switch' && (
        <SwitchModel closed={tile.closed} ghost={ghost} wireMat={wireMat} />
      )}
    </group>
  );
}

/** A cosy stone with a little bush on top: nothing gets through here. */
function BlockModel() {
  const { geometry: g, material: m } = getAssets();
  return (
    <group>
      <mesh geometry={g.blockBody} material={m.base.block} position-y={0.21} />
      <mesh geometry={g.bush} material={m.bush} position={[-0.1, 0.48, 0.05]} />
      <mesh geometry={g.bush} material={m.bush} position={[0.12, 0.45, -0.08]} scale={0.7} />
    </group>
  );
}

const LEVER_OPEN_ANGLE = 0.65;

/** Two posts and a lever hinged on the left one. Closed: the lever lies across both posts. */
function SwitchModel({
  closed,
  ghost,
  wireMat,
}: {
  closed: boolean;
  ghost: boolean;
  wireMat: Material;
}) {
  const { geometry: g, material: m } = getAssets();
  const lever = useRef<Group>(null);
  useFrame((_, delta) => {
    if (!lever.current) return;
    const target = closed ? 0 : LEVER_OPEN_ANGLE;
    const z = lever.current.rotation.z;
    lever.current.rotation.z = z + (target - z) * (1 - Math.exp(-delta * 16));
  });
  const pick = (mat: Material) => (ghost ? m.ghost : mat);
  return (
    <>
      <Arm dir={W} length={0.24} material={wireMat} />
      <Arm dir={E} length={0.24} material={wireMat} />
      <mesh geometry={g.switchPost} material={pick(m.marking)} position={[-0.25, TOP + 0.06, 0]} />
      <mesh geometry={g.switchPost} material={pick(m.marking)} position={[0.25, TOP + 0.06, 0]} />
      <group
        ref={lever}
        position={[-0.25, TOP + 0.13, 0]}
        rotation-z={closed ? 0 : LEVER_OPEN_ANGLE}
      >
        <mesh geometry={g.lever} material={pick(closed ? wireMat : m.switchOff)} />
        <mesh
          geometry={g.knob}
          material={pick(closed ? m.switchOn : m.switchOff)}
          position={[0.5, 0.02, 0]}
        />
      </group>
    </>
  );
}

function wireMaterial(result: TileResult | null): Material {
  const { material: m } = getAssets();
  if (result?.status === 'SHORT_CIRCUIT') return m.wireShort;
  const level = currentLevel(result?.current ?? 0);
  return m.wireLevels[Math.ceil(level * 4)]!;
}

/** A wire segment from `0.5 − length` out to the tile edge in direction `dir`. */
function Arm({
  dir,
  length = 0.5,
  material,
}: {
  dir: Direction;
  length?: number;
  material: Material;
}) {
  const { geometry: g } = getAssets();
  const [vx, vz] = DIR_VECTORS[dir];
  const c = 0.5 - length / 2;
  return (
    <mesh
      geometry={g.arm}
      material={material}
      position={[vx * c, TOP + 0.04, vz * c]}
      rotation-y={vx !== 0 ? Math.PI / 2 : 0}
      scale-z={length / 0.5}
    />
  );
}

type Vec3 = [number, number, number];

function Plus({ position, material }: { position: Vec3; material: Material }) {
  const { geometry: g } = getAssets();
  return (
    <group position={position}>
      <mesh geometry={g.plusBar} material={material} />
      <mesh geometry={g.plusBar} material={material} rotation-y={Math.PI / 2} />
    </group>
  );
}

function Minus({ position, material }: { position: Vec3; material: Material }) {
  const { geometry: g } = getAssets();
  return <mesh geometry={g.plusBar} material={material} position={position} />;
}

function Rivets() {
  const { geometry: g, material: m } = getAssets();
  return (
    <>
      {[
        [-1, -1],
        [1, -1],
        [-1, 1],
        [1, 1],
      ].map(([sx, sz]) => (
        <mesh
          key={`${sx}${sz}`}
          geometry={g.rivet}
          material={m.rivet}
          position={[sx! * 0.36, TOP + 0.005, sz! * 0.36]}
        />
      ))}
    </>
  );
}

const PUFF_SECONDS = 0.9;

function LedModel({
  result,
  ghost,
  wireMat,
}: {
  result: TileResult | null;
  ghost: boolean;
  wireMat: Material;
}) {
  const { geometry: g, material: m } = getAssets();
  const mats = useMemo(() => {
    const led = createLedMaterials();
    const puff = new MeshBasicMaterial({
      color: '#b9b2c0',
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    return { ...led, puff };
  }, []);
  useEffect(() => () => Object.values(mats).forEach((mat) => mat.dispose()), [mats]);

  const halo = useRef<Sprite>(null);
  const puffGroup = useRef<Group>(null);
  const puffStart = useRef(-1);
  const prevStatus = useRef(result?.status);
  const burned = result?.status === 'BURNED_OUT';
  const glow = perceivedGlow(result?.brightness ?? 0);

  useEffect(() => {
    mats.dome.emissiveIntensity = 2.4 * glow;
    mats.dome.color = new Color(glow > 0 ? COLORS.ledRed : '#e98f93');
    mats.halo.opacity = glow > 0 ? 0.25 + 0.65 * glow : 0;
    if (burned && prevStatus.current !== 'BURNED_OUT') puffStart.current = -2; // start next frame
    prevStatus.current = result?.status;
  }, [glow, burned, mats, result?.status]);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (halo.current) {
      const s = (0.7 + 1.5 * glow) * (1 + 0.04 * Math.sin(t * 2.2));
      halo.current.scale.set(s, s, s);
    }
    if (puffStart.current === -2) puffStart.current = t;
    const group = puffGroup.current;
    if (!group) return;
    const p = puffStart.current < 0 ? 1 : (t - puffStart.current) / PUFF_SECONDS;
    group.visible = p < 1;
    if (p >= 1) return;
    mats.puff.opacity = 0.75 * (1 - p);
    group.children.forEach((child, i) => {
      const a = (i / group.children.length) * Math.PI * 2;
      const r = 0.08 + 0.4 * p;
      child.position.set(Math.cos(a) * r, TOP + 0.2 + 0.45 * p, Math.sin(a) * r);
      child.scale.setScalar(0.6 + 1.4 * p);
    });
  });

  const dome = ghost ? m.ghost : burned ? m.ledBurned : mats.dome;
  return (
    <>
      <Arm dir={W} length={0.3} material={wireMat} />
      <Arm dir={E} length={0.3} material={wireMat} />
      <mesh geometry={g.ledRim} material={dome} position-y={TOP + 0.035} />
      <mesh geometry={g.ledDome} material={dome} position-y={TOP + 0.07} />
      {burned && !ghost && (
        <group position-y={TOP + 0.255}>
          <mesh geometry={g.crack} material={m.crack} rotation-y={0.5} />
          <mesh
            geometry={g.crack}
            material={m.crack}
            rotation-y={-0.9}
            position-x={0.04}
            scale-z={0.6}
          />
          <mesh
            geometry={g.crack}
            material={m.crack}
            rotation-y={1.6}
            position-z={-0.04}
            scale-z={0.5}
          />
        </group>
      )}
      <Plus position={[-0.3, TOP + 0.013, 0.27]} material={ghost ? m.ghost : m.marking} />
      <Minus position={[0.3, TOP + 0.013, 0.27]} material={ghost ? m.ghost : m.marking} />
      {!ghost && (
        <>
          <sprite ref={halo} material={mats.halo} position-y={TOP + 0.2} />
          <group ref={puffGroup} visible={false}>
            {Array.from({ length: 7 }, (_, i) => (
              <mesh key={i} geometry={g.puff} material={mats.puff} />
            ))}
          </group>
        </>
      )}
    </>
  );
}
