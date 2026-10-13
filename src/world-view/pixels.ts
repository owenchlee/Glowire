// Pixel-art textures and the night-lighting material every world sprite is drawn with.
//
// The whole town is lit the same way, whichever art pack a tile came from: a dark blue
// night, warm pools of light around lamps and fixed buildings, and window glass that
// glows once its building is lit. Glowing pixels are marked in the art with alpha 254
// (see scripts/art.mjs).

import { Asset } from 'expo-asset';
import { Platform } from 'react-native';
import {
  Color,
  DataTexture,
  LinearFilter,
  NearestFilter,
  RedFormat,
  ShaderMaterial,
  type Texture,
  TextureLoader,
  Vector2,
  Vector3,
  Vector4,
} from 'three';

export const MAX_LIGHTS = 24;

/** Load a bundled PNG (a `require(...)`) as a crisp, unfiltered texture. */
export async function loadPixelTexture(module: number): Promise<Texture> {
  // On web the loader needs a URL; on iOS/Android R3F's loader takes the module itself.
  const source = Platform.OS === 'web' ? Asset.fromModule(module).uri : module;
  const texture = await new TextureLoader().loadAsync(source as string);
  texture.magFilter = NearestFilter;
  texture.minFilter = NearestFilter;
  texture.generateMipmaps = false;
  texture.premultiplyAlpha = false;
  texture.needsUpdate = true;
  return texture;
}

/**
 * Darkness over the parts of a map you can't reach yet: one value per cell (0 clear, 255
 * black), blurred between cells by the GPU so its edge is soft.
 */
export function createFog(width: number, height: number): DataTexture {
  const t = new DataTexture(new Uint8Array(width * height), width, height, RedFormat);
  t.magFilter = LinearFilter;
  t.minFilter = LinearFilter;
  t.needsUpdate = true;
  return t;
}

/**
 * The light in one scene, shared by all its materials so one update relights everything.
 * Each scene has its own (the town keeps running under a puzzle).
 */
export function createLighting(ambient: string, fog: DataTexture = createFog(1, 1)) {
  const img = fog.image as { width: number; height: number };
  return {
    uAmbient: { value: new Color(ambient) },
    uLights: { value: Array.from({ length: MAX_LIGHTS }, () => new Vector4()) },
    uLightColors: { value: Array.from({ length: MAX_LIGHTS }, () => new Vector3()) },
    uLightCount: { value: 0 },
    uTime: { value: 0 },
    uFog: { value: fog },
    uFogSize: { value: new Vector2(img.width, img.height) },
  };
}
export type Lighting = ReturnType<typeof createLighting>;

const vertex = /* glsl */ `
  attribute float aLit;
  attribute vec3 aTint;
  varying vec2 vUv;
  varying vec2 vWorld;
  varying float vLit;
  varying vec3 vTint;
  void main() {
    vUv = uv;
    vLit = aLit;
    vTint = aTint;
    vec4 world = modelMatrix * vec4(position, 1.0);
    #ifdef LOCAL_LIGHT
      vWorld = position.xy;
    #else
      vWorld = world.xy;
    #endif
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

const fragment = /* glsl */ `
  uniform sampler2D uMap;
  uniform vec3 uAmbient;
  uniform vec4 uLights[${MAX_LIGHTS}];
  uniform vec3 uLightColors[${MAX_LIGHTS}];
  uniform int uLightCount;
  uniform float uTime;
  uniform float uLitAll;
  uniform sampler2D uFog;
  uniform vec2 uFogSize;
  varying vec2 vUv;
  varying vec2 vWorld;
  varying float vLit;
  varying vec3 vTint;

  void main() {
    vec4 c = texture2D(uMap, vUv);
    if (c.a < 0.5) discard;

    // Light falls on whole art pixels (1/16 of a tile) and in soft steps, like hand-drawn light.
    vec2 p = floor(vWorld * 16.0) / 16.0;
    vec3 light = uAmbient;
    for (int i = 0; i < ${MAX_LIGHTS}; i++) {
      if (i >= uLightCount) break;
      vec4 l = uLights[i];
      float f = 1.0 - clamp(distance(p, l.xy) / l.z, 0.0, 1.0);
      f = floor(f * f * 10.0 + 0.5) / 10.0;
      light += uLightColors[i] * f * l.w * 0.85;
    }
    vec3 col = c.rgb * light;

    // Glass, bulbs, copper and LEDs: dark until lit, then glowing at full strength (warm,
    // or the quad's tint).
    if (c.a < 0.999) {
      float lit = max(vLit, uLitAll);
      float lum = dot(c.rgb, vec3(0.299, 0.587, 0.114));
      vec3 warm = vTint.r + vTint.g + vTint.b > 0.0
        ? mix(vTint, vec3(1.0), lum * 0.55)
        : mix(vec3(1.0, 0.62, 0.25), vec3(1.0, 0.95, 0.7), lum);
      float flicker = 0.94 + 0.06 * sin(uTime * 3.0 + vWorld.x * 1.7 + vWorld.y);
      col = mix(c.rgb * uAmbient * 0.55, warm * (0.7 + 0.3 * lum) * flicker, lit);
    }

    // Beyond the open part of the route: near-black, in a few hand-drawn-looking steps.
    float fog = texture2D(uFog, vec2(p.x / uFogSize.x, -p.y / uFogSize.y)).r;
    fog = floor(fog * 6.0 + 0.5) / 6.0;
    col = mix(col, c.rgb * vec3(0.05, 0.06, 0.12), fog * 0.92);
    gl_FragColor = vec4(col, 1.0);
  }
`;

/**
 * A lit material for one texture. `litAll` lights every glowing pixel (used for people).
 * With `local`, lights are placed in the mesh's own coordinates (map cells) rather than the
 * scene's, so a map can be drawn moved, turned or scaled (the backdrop behind a puzzle).
 */
export function worldMaterial(map: Texture, lighting: Lighting, litAll = 0, local = false): ShaderMaterial {
  return new ShaderMaterial({
    uniforms: { ...lighting, uMap: { value: map }, uLitAll: { value: litAll } },
    vertexShader: vertex,
    fragmentShader: fragment,
    defines: local ? { LOCAL_LIGHT: 1 } : {},
  });
}
