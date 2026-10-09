// The pets: Scout the Mole, Hoot the Owl and Penny the Magpie. Each idles with a little
// bounce, and hops when it's used.

import { useEffect, useRef } from 'react';
import { Animated, Easing } from 'react-native';
import Svg, { Circle, Ellipse, G, Path, Polygon, Rect } from 'react-native-svg';

export function Pet({
  id,
  size = 48,
  still = false,
  hopKey = 0,
}: {
  id: string;
  size?: number;
  still?: boolean;
  /** Change this to make the pet hop. */
  hopKey?: number;
}) {
  const idle = useRef(new Animated.Value(0)).current;
  const hop = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (still) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(idle, {
          toValue: 1,
          duration: 700,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(idle, {
          toValue: 0,
          duration: 700,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.delay(900),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [idle, still]);

  useEffect(() => {
    if (!hopKey) return;
    hop.setValue(0);
    Animated.sequence([
      Animated.timing(hop, { toValue: 1, duration: 160, useNativeDriver: true }),
      Animated.spring(hop, { toValue: 0, friction: 3, useNativeDriver: true }),
    ]).start();
  }, [hopKey, hop]);

  const squash = idle.interpolate({ inputRange: [0, 1], outputRange: [1, 0.94] });
  const lift = hop.interpolate({ inputRange: [0, 1], outputRange: [0, -size * 0.35] });
  return (
    <Animated.View
      style={{ width: size, height: size, transform: [{ translateY: lift }, { scaleY: squash }] }}
    >
      <Svg width={size} height={size} viewBox="0 0 100 100">
        {id === 'scout' && <Mole />}
        {id === 'hoot' && <Owl />}
        {id === 'penny' && <Magpie />}
      </Svg>
    </Animated.View>
  );
}

function Mole() {
  return (
    <G>
      <Ellipse cx={50} cy={94} rx={26} ry={4} fill="#000" opacity={0.15} />
      <Ellipse cx={50} cy={66} rx={30} ry={27} fill="#8a7a92" />
      <Ellipse cx={50} cy={74} rx={18} ry={16} fill="#b3a5ba" />
      {/* Big digging paws */}
      <Ellipse cx={24} cy={82} rx={11} ry={7} fill="#ffb3c1" />
      <Ellipse cx={76} cy={82} rx={11} ry={7} fill="#ffb3c1" />
      <Circle cx={40} cy={56} r={3.5} fill="#2b2433" />
      <Circle cx={60} cy={56} r={3.5} fill="#2b2433" />
      <Ellipse cx={50} cy={65} rx={7} ry={5} fill="#ff8fa3" />
      {/* A miner's helmet with a lamp */}
      <Path d="M24 46 Q26 20 50 20 Q74 20 76 46 Z" fill="#ffc93c" />
      <Rect x={20} y={43} width={60} height={6} rx={3} fill="#f0b21f" />
      <Circle cx={50} cy={30} r={7} fill="#fff7c2" />
      <Circle cx={50} cy={30} r={11} fill="#fff7c2" opacity={0.35} />
    </G>
  );
}

function Owl() {
  return (
    <G>
      <Ellipse cx={50} cy={95} rx={24} ry={4} fill="#000" opacity={0.15} />
      <Polygon points="24,30 32,12 40,28" fill="#a87d52" />
      <Polygon points="76,30 68,12 60,28" fill="#a87d52" />
      <Ellipse cx={50} cy={58} rx={30} ry={35} fill="#c49a6c" />
      <Ellipse cx={50} cy={70} rx={19} ry={21} fill="#f1dcb4" />
      <Path
        d="M40 70 L44 74 L48 70 M52 70 L56 74 L60 70 M44 80 L48 84 L52 80 L56 84"
        stroke="#d9b98a"
        strokeWidth={2}
        fill="none"
      />
      <Circle cx={38} cy={44} r={12} fill="#ffd56b" />
      <Circle cx={62} cy={44} r={12} fill="#ffd56b" />
      <Circle cx={38} cy={44} r={6} fill="#2b2433" />
      <Circle cx={62} cy={44} r={6} fill="#2b2433" />
      <Circle cx={40} cy={42} r={2} fill="#fff" />
      <Circle cx={64} cy={42} r={2} fill="#fff" />
      <Polygon points="46,54 54,54 50,62" fill="#f08c3a" />
      {/* Tiny reading glasses, perched smugly */}
      <Path
        d="M28 46 Q38 54 48 46 M52 46 Q62 54 72 46"
        stroke="#5b4e6e"
        strokeWidth={1.6}
        fill="none"
      />
    </G>
  );
}

function Magpie() {
  return (
    <G>
      <Ellipse cx={50} cy={95} rx={22} ry={4} fill="#000" opacity={0.15} />
      <Polygon points="16,70 2,86 24,80" fill="#3d3a4a" />
      <Ellipse cx={46} cy={64} rx={28} ry={24} fill="#3d3a4a" />
      <Ellipse cx={50} cy={72} rx={16} ry={14} fill="#ffffff" />
      <Path d="M28 56 Q42 50 50 64 Q38 70 28 56 Z" fill="#7fb3ff" />
      <Circle cx={62} cy={38} r={17} fill="#3d3a4a" />
      <Circle cx={67} cy={35} r={3.5} fill="#ffffff" />
      <Circle cx={68} cy={35} r={2} fill="#2b2433" />
      <Polygon points="77,38 92,42 77,45" fill="#f2c94c" />
      {/* A shiny spark in its feet */}
      <Circle cx={56} cy={88} r={7} fill="#ffd56b" />
      <Polygon points="56,82 58,86 62,88 58,90 56,94 54,90 50,88 54,86" fill="#fff6c9" />
      <Rect x={38} y={86} width={3} height={8} fill="#2b2433" />
      <Rect x={46} y={86} width={3} height={8} fill="#2b2433" />
    </G>
  );
}
