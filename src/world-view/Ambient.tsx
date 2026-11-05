// Little things that make a world feel alive: fireflies at dusk and night, birds and sparkles
// by day, and falling leaves drifting across
// the screen, and a puff of dust at the hero's heels. Drawn as chunky square points, two
// art pixels across, so they match the pixel art.

import { type RefObject, useMemo, useRef } from 'react';
import { AdditiveBlending, BufferAttribute, BufferGeometry, type OrthographicCamera, type Points, ShaderMaterial, Sphere, Vector3 } from 'three';

import { type Walker, walkerPosition } from '../world/walker';
import { useFrame } from '../render/r3f';
import { currentPhase, daylight } from './daylight';

const POINT_VERT = /* glsl */ `
  attribute vec3 aColor;
  attribute float aAlpha;
  uniform float uSize;
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    vColor = aColor;
    vAlpha = aAlpha;
    gl_PointSize = uSize * (0.6 + 0.8 * aAlpha);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const POINT_FRAG = /* glsl */ `
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    if (vAlpha < 0.08) discard;
    gl_FragColor = vec4(vColor, 1.0);
  }
`;

function pointMaterial(additive: boolean) {
  const m = new ShaderMaterial({
    uniforms: { uSize: { value: 4 } },
    vertexShader: POINT_VERT,
    fragmentShader: POINT_FRAG,
    transparent: additive,
    depthTest: false,
    depthWrite: false,
  });
  if (additive) m.blending = AdditiveBlending;
  return m;
}

/** Two art pixels across, in device pixels, for this camera. */
function pointSize(camera: OrthographicCamera, dpr: number) {
  return Math.max(2, Math.round((camera.zoom / 16) * 2) * dpr);
}

function cloud(count: number) {
  const g = new BufferGeometry();
  g.setAttribute('position', new BufferAttribute(new Float32Array(count * 3), 3));
  g.setAttribute('aColor', new BufferAttribute(new Float32Array(count * 3), 3));
  g.setAttribute('aAlpha', new BufferAttribute(new Float32Array(count), 1));
  // The points move every frame, so give them one sphere that always covers the map.
  g.boundingSphere = new Sphere(new Vector3(), 1e6);
  return g;
}

export type AmbientKind = { fireflies: readonly [number, number, number]; leaves?: readonly [number, number, number][] };

/** What drifts in each world. */
export const AMBIENT: Record<string, AmbientKind> = {
  glowtown: { fireflies: [1.0, 0.85, 0.4], leaves: [[0.98, 0.7, 0.75], [0.72, 0.78, 0.25]] },
  harbour: { fireflies: [0.75, 0.95, 1.0] },
  mossbell: { fireflies: [0.65, 1.0, 0.55], leaves: [[0.9, 0.55, 0.25]] },
};

/** Fireflies blinking in place and leaves falling past, spread over whatever the camera sees. */
export function Ambient({ kind, underwater = false }: { kind: AmbientKind; underwater?: boolean }) {
  const FIREFLIES = 26;
  const LEAVES = kind.leaves ? 16 : 0;
  const BIRDS = 4; // two points each (wings)
  const SPARKLES = 10;
  const total = FIREFLIES + LEAVES + BIRDS * 2 + SPARKLES;
  const ref = useRef<Points>(null);
  const geometry = useMemo(() => cloud(total), [total]);
  const material = useMemo(() => pointMaterial(false), []);
  const seeds = useMemo(
    () => Array.from({ length: total }, (_, i) => ({ x: (i * 0.618034) % 1, y: (i * 0.381966 + 0.13) % 1, a: 0.5 + ((i * 0.37) % 1), b: (i * 1.7) % 6.28 })),
    [total],
  );

  useFrame((state) => {
    const cam = state.camera as OrthographicCamera;
    const t = state.clock.elapsedTime;
    const w = state.size.width / cam.zoom + 2;
    const h = state.size.height / cam.zoom + 2;
    const pos = geometry.getAttribute('position') as BufferAttribute;
    const col = geometry.getAttribute('aColor') as BufferAttribute;
    const alpha = geometry.getAttribute('aAlpha') as BufferAttribute;
    const dl = underwater ? null : daylight(currentPhase());
    const nightAmt = dl ? dl.fireflies : 1;
    const dayAmt = dl ? dl.birds : 0;
    const wrap = (v: number, lo: number, span: number) => lo + ((((v - lo) % span) + span) % span);
    for (let i = 0; i < total; i++) {
      const s = seeds[i]!;
      if (i < FIREFLIES) {
        // A firefly loops lazily round a spot of its own, blinking on and off.
        const x = wrap(s.x * w * 5, cam.position.x - w / 2, w) + Math.sin(t * 0.35 * s.a + s.b) * 0.9;
        const y = wrap(s.y * h * 5, cam.position.y - h / 2, h) + Math.cos(t * 0.27 * s.a + s.b * 1.3) * 0.6;
        pos.setXYZ(i, Math.round(x * 16) / 16, Math.round(y * 16) / 16, 6);
        col.setXYZ(i, ...kind.fireflies);
        const out = i / FIREFLIES < nightAmt;
        alpha.setX(i, out && Math.max(0, Math.sin(t * 1.3 * s.a + s.b * 3)) > 0.35 ? 1 : 0);
      } else if (i >= FIREFLIES + LEAVES + BIRDS * 2) {
        // By day a few sparkles glint over the grass and water, rising a little as they fade.
        const k = i - (FIREFLIES + LEAVES + BIRDS * 2);
        const x = wrap(s.x * w * 7, cam.position.x - w / 2, w);
        const y = wrap(s.y * h * 7 + ((t * 0.12 * s.a) % 0.6), cam.position.y - h / 2, h);
        pos.setXYZ(i, Math.round(x * 16) / 16, Math.round(y * 16) / 16, 6);
        col.setXYZ(i, 1, 0.97, 0.7);
        alpha.setX(i, k / SPARKLES < dayAmt && Math.sin(t * 1.1 * s.a + s.b * 5) > 0.82 ? 1 : 0);
      } else if (i >= FIREFLIES + LEAVES) {
        // Birds cross the screen in a slow glide, wings beating (the pair of points flaps).
        const k = i - FIREFLIES - LEAVES;
        const bird = k >> 1;
        const sd = seeds[FIREFLIES + LEAVES + bird * 2]!;
        const x = wrap(sd.x * w * 4 + t * (0.9 + sd.a * 0.5), cam.position.x - w / 2, w * 1.6) ;
        const y = cam.position.y - h / 2 + ((sd.y * 3) % 1) * h + Math.sin(t * 0.7 + sd.b) * 0.6;
        const flap = Math.sin(t * 9 + sd.b * 4) > 0 ? 1 / 16 : -1 / 16;
        const wing = k & 1 ? 1 : -1;
        pos.setXYZ(i, Math.round((x + wing * 0.16) * 16) / 16, Math.round((y + flap * 2 * (wing > 0 ? 1 : -1) * -1) * 16) / 16, 6);
        col.setXYZ(i, 0.16, 0.16, 0.22);
        alpha.setX(i, bird / BIRDS < dayAmt ? 1 : 0);
      } else {
        // A leaf tumbles down and sideways, wobbling as it goes.
        const k = i - FIREFLIES;
        const x = wrap(s.x * w * 3 + t * 0.55 * s.a, cam.position.x - w / 2, w) + Math.sin(t * 1.4 + s.b) * 0.35;
        const y = wrap(s.y * h * 3 - t * 0.5 * s.a, cam.position.y - h / 2, h);
        pos.setXYZ(i, Math.round(x * 16) / 16, Math.round(y * 16) / 16, 6);
        col.setXYZ(i, ...kind.leaves![k % kind.leaves!.length]!);
        alpha.setX(i, 1);
      }
    }
    touch(pos, col, alpha);
    setSize(material, pointSize(cam, state.viewport.dpr));
  });

  return <points ref={ref} geometry={geometry} material={material} frustumCulled={false} renderOrder={10} />;
}

/** A puff of dust kicked up behind the hero's feet as they walk. */
export function Dust({ walker }: { walker: RefObject<Walker> }) {
  const N = 14;
  const geometry = useMemo(() => cloud(N), []);
  const material = useMemo(() => pointMaterial(false), []);
  const puffs = useRef(Array.from({ length: N }, () => ({ x: 0, y: 0, life: 0 })));
  const last = useRef<{ x: number; y: number } | null>(null);
  const travelled = useRef(0);
  const next = useRef(0);

  useFrame((state, delta) => {
    const cam = state.camera as OrthographicCamera;
    const p = walkerPosition(walker.current);
    if (last.current) {
      const d = Math.hypot(p.x - last.current.x, p.y - last.current.y);
      if (d < 1.5) travelled.current += d;
    }
    last.current = { x: p.x, y: p.y };
    // One puff every half cell or so of walking.
    if (travelled.current > 0.5) {
      travelled.current = 0;
      const slot = puffs.current[next.current++ % N]!;
      slot.x = p.x + 0.5 + (Math.random() - 0.5) * 0.25;
      slot.y = -p.y - 0.88;
      slot.life = 1;
    }
    const pos = geometry.getAttribute('position') as BufferAttribute;
    const col = geometry.getAttribute('aColor') as BufferAttribute;
    const alpha = geometry.getAttribute('aAlpha') as BufferAttribute;
    puffs.current.forEach((s, i) => {
      s.life = Math.max(0, s.life - delta * 2.6);
      pos.setXYZ(i, Math.round(s.x * 16) / 16, Math.round((s.y + (1 - s.life) * 0.3) * 16) / 16, 6);
      col.setXYZ(i, 0.86, 0.82, 0.7);
      alpha.setX(i, s.life);
    });
    touch(pos, col, alpha);
    setSize(material, pointSize(cam, state.viewport.dpr));
  });

  return <points geometry={geometry} material={material} frustumCulled={false} renderOrder={9} />;
}

// Mutating GPU buffers happens here, outside the components, so it's clearly per-frame work.
function touch(...attrs: BufferAttribute[]) {
  for (const a of attrs) a.needsUpdate = true;
}
function setSize(m: ShaderMaterial, size: number) {
  m.uniforms.uSize!.value = size;
}
