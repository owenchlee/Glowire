// The game never starts a WebXR session; the renderer only needs this inert manager. Web only.
import { EventDispatcher } from 'three/src/core/EventDispatcher.js';

export class WebXRManager extends EventDispatcher {
  enabled = false;
  isPresenting = false;
  cameraAutoUpdate = true;
  setAnimationLoop() {}
  hasDepthSensing() {
    return false;
  }
  dispose() {}
}
