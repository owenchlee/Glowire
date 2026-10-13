// A thumb stick for touch screens, bottom left: push it any way (diagonals too) to walk.
// It hands its direction straight to the walker, so walking is as smooth as the keyboard.

import { useRef, useState } from 'react';
import { type GestureResponderEvent, Platform, StyleSheet, View } from 'react-native';

const RADIUS = 46;
const KNOB = 40;

/** Touch screens only: on a computer the keyboard does this. */
const hasTouch = () =>
  Platform.OS !== 'web' || (typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0));

/** `onInput`: the direction pushed, -1…1 on each axis (0, 0 when let go). */
export function Joystick({ onInput }: { onInput: (x: number, y: number) => void }) {
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const origin = useRef({ x: 0, y: 0 });
  if (!hasTouch()) return null;

  const push = (e: GestureResponderEvent) => {
    let dx = e.nativeEvent.pageX - origin.current.x;
    let dy = e.nativeEvent.pageY - origin.current.y;
    const d = Math.hypot(dx, dy);
    if (d > RADIUS) {
      dx = (dx / d) * RADIUS;
      dy = (dy / d) * RADIUS;
    }
    setKnob({ x: dx, y: dy });
    onInput(dx / RADIUS, dy / RADIUS);
  };
  const release = () => {
    setKnob({ x: 0, y: 0 });
    onInput(0, 0);
  };

  return (
    <View
      style={styles.base}
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => true}
      onResponderTerminationRequest={() => false}
      onResponderGrant={(e) => {
        // The stick's middle, in page coordinates.
        const { pageX, pageY, locationX, locationY } = e.nativeEvent;
        origin.current = { x: pageX - locationX + RADIUS + 14, y: pageY - locationY + RADIUS + 14 };
        push(e);
      }}
      onResponderMove={push}
      onResponderRelease={release}
      onResponderTerminate={release}
    >
      <View style={styles.ring} pointerEvents="none">
        <View style={[styles.knob, { transform: [{ translateX: knob.x }, { translateY: knob.y }] }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  base: { position: 'absolute', left: 10, bottom: 10, width: RADIUS * 2 + 28, height: RADIUS * 2 + 28, padding: 14 },
  ring: {
    width: RADIUS * 2,
    height: RADIUS * 2,
    borderRadius: RADIUS,
    borderWidth: 3,
    borderColor: 'rgba(255, 229, 138, 0.45)',
    backgroundColor: 'rgba(13, 15, 30, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  knob: {
    width: KNOB,
    height: KNOB,
    borderRadius: KNOB / 2,
    backgroundColor: 'rgba(255, 229, 138, 0.8)',
    borderWidth: 3,
    borderColor: '#5b3a29',
  },
});
