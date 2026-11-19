// The game casts no shadows, so the renderer gets an inert shadow map instead of the ~17 KB real one. Web only.
export class WebGLShadowMap {
  enabled = false;
  autoUpdate = true;
  needsUpdate = false;
  type = 1;
  render() {}
}
