// Web (dev preview only): R3F's DOM canvas. Metro picks this file on web.
import { Canvas as DomCanvas, type CanvasProps } from '@react-three/fiber';
import { createElement, useEffect } from 'react';

export { useFrame, useThree } from '@react-three/fiber';

/**
 * The DOM canvas can measure its container before React Native Web has laid it out, and
 * then sits at the browser's default 300×150 (a blank board). A resize event just after
 * mounting makes it measure again.
 */
export function Canvas(props: CanvasProps) {
  useEffect(() => {
    const timers = [50, 400].map((ms) =>
      setTimeout(() => window.dispatchEvent(new Event('resize')), ms),
    );
    return () => timers.forEach(clearTimeout);
  }, []);
  return createElement(DomCanvas, props);
}
