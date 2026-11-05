import { useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

import { Counter, GOLD, PixelText } from '../ui/pixel';
import { clockText, currentPhase, daylight } from './daylight';

/** The name of the place you've just walked into, fading in over the picture and away again. */
export function AreaBanner({ name, world }: { name: string; world: string }) {
  const [t] = useState(() => new Animated.Value(0));
  useEffect(() => {
    Animated.sequence([
      Animated.timing(t, { toValue: 1, duration: 450, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.delay(1700),
      Animated.timing(t, { toValue: 0, duration: 700, useNativeDriver: true }),
    ]).start();
  }, [t]);
  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.banner, { opacity: t, transform: [{ translateY: t.interpolate({ inputRange: [0, 1], outputRange: [-10, 0] }) }] }]}
    >
      <PixelText size={12} color="#c9c3e6" shadow>
        {world.toUpperCase()}
      </PixelText>
      <PixelText size={28} color={GOLD} shadow>
        {name}
      </PixelText>
    </Animated.View>
  );
}

/** How full the lantern is: a little jar that drains, gold when full and red when nearly out. */
export function LanternGauge({ value }: { value: number }) {
  const color = value > 0.5 ? '#ffd27a' : value > 0.25 ? '#ef914f' : '#e0394c';
  return (
    <View style={styles.gauge} pointerEvents="none">
      <PixelText size={11} color={color} shadow>
        Lantern
      </PixelText>
      <View style={styles.gaugeBar}>
        <View style={[styles.gaugeFill, { width: `${Math.round(value * 100)}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

/** Sun or moon and the time of day, in the HUD. Ticks on its own so the screen doesn't re-render. */
export function ClockBadge() {
  const [phase, setPhase] = useState(() => currentPhase());
  useEffect(() => {
    const id = setInterval(() => setPhase(currentPhase()), 1000);
    return () => clearInterval(id);
  }, []);
  const d = daylight(phase);
  return <Counter icon={d.day > 0.45 ? '☀' : '☾'} value={clockText(phase)} color={d.day > 0.45 ? '#ffe58a' : '#c9d4ff'} />;
}

const styles = StyleSheet.create({
  banner: { position: 'absolute', top: 96, left: 0, right: 0, alignItems: 'center', gap: 2 },
  gauge: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 },
  gaugeBar: { width: 70, height: 10, borderWidth: 2, borderColor: '#141b1b', backgroundColor: '#2e2b30', borderRadius: 2 },
  gaugeFill: { height: '100%' },
});
