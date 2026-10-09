// Grumble: the cranky little thundercloud who zapped the power station.

import { useEffect, useRef } from 'react';
import { Animated, Easing } from 'react-native';
import Svg, { Circle, G, Path, Polygon } from 'react-native-svg';

export function Grumble({ size = 64, still = false }: { size?: number; still?: boolean }) {
  const drift = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (still) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(drift, {
          toValue: 1,
          duration: 1600,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(drift, {
          toValue: 0,
          duration: 1600,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [drift, still]);
  const translateX = drift.interpolate({
    inputRange: [0, 1],
    outputRange: [-size * 0.04, size * 0.04],
  });

  return (
    <Animated.View style={{ width: size, height: size, transform: [{ translateX }] }}>
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Polygon points="44,62 36,80 46,80 40,98 60,72 50,72 56,62" fill="#ffd56b" />
        <G fill="#7d7a9c">
          <Circle cx={30} cy={50} r={17} />
          <Circle cx={50} cy={38} r={22} />
          <Circle cx={72} cy={48} r={18} />
          <Circle cx={50} cy={58} r={16} />
        </G>
        <G fill="#9693b5">
          <Circle cx={46} cy={32} r={10} />
          <Circle cx={68} cy={42} r={7} />
        </G>
        {/* Cross eyebrows, beady eyes, a big frown */}
        <Path d="M33 41 L46 46" stroke="#2e2a40" strokeWidth={3.5} strokeLinecap="round" />
        <Path d="M67 41 L54 46" stroke="#2e2a40" strokeWidth={3.5} strokeLinecap="round" />
        <Circle cx={41} cy={51} r={3.5} fill="#2e2a40" />
        <Circle cx={59} cy={51} r={3.5} fill="#2e2a40" />
        <Path
          d="M41 64 Q50 57 59 64"
          stroke="#2e2a40"
          strokeWidth={3}
          fill="none"
          strokeLinecap="round"
        />
      </Svg>
    </Animated.View>
  );
}
