// The renderer only builds its HDR output pass when outputBufferType is not UnsignedByte, which the game never sets. Web only.
export function WebGLOutput() {
  this.setSize = this.setEffects = this.end = this.dispose = () => {};
  this.begin = this.hasRenderPass = this.isCompositing = () => false;
}
