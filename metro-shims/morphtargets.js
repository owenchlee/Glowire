// The game has no morph targets, so the renderer gets an inert updater instead of the real one. Web only.
export function WebGLMorphtargets() {
  return { update() {} };
}
