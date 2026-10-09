// Pip: a little robot built from a battery, with an LED for an eye. Bobs, blinks, and pulls
// a face to match what's happening on the board.

import { useEffect, useRef, useState } from 'react';
import { Animated, Easing } from 'react-native';
import Svg, { Circle, Ellipse, G, Line, Path, Polygon, Rect } from 'react-native-svg';

export type Mood = 'happy' | 'thinking' | 'worried' | 'shocked' | 'cheer' | 'sleepy';

const EYE: Record<Mood, string> = {
  happy: '#ffd56b',
  thinking: '#9fd4ff',
  worried: '#ffb15c',
  shocked: '#ff5a5f',
  cheer: '#7dffb4',
  sleepy: '#c9b8ff',
};

export function Pip({
  size = 72,
  mood = 'happy',
  hat = 'nohat',
  still = false,
}: {
  size?: number;
  mood?: Mood;
  hat?: string;
  /** No bobbing (for small icons and the shop). */
  still?: boolean;
}) {
  const bob = useRef(new Animated.Value(0)).current;
  const pop = useRef(new Animated.Value(1)).current;
  const [blink, setBlink] = useState(false);

  useEffect(() => {
    if (still) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(bob, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(bob, {
          toValue: 0,
          duration: 900,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [bob, still]);

  useEffect(() => {
    if (still) return;
    let open: ReturnType<typeof setTimeout> | undefined;
    const timer = setInterval(() => {
      setBlink(true);
      open = setTimeout(() => setBlink(false), 140);
    }, 3200);
    return () => {
      clearInterval(timer);
      if (open) clearTimeout(open);
    };
  }, [still]);

  // A little hop whenever the mood changes.
  useEffect(() => {
    pop.setValue(0.85);
    Animated.spring(pop, { toValue: 1, friction: 4, tension: 160, useNativeDriver: true }).start();
  }, [mood, pop]);

  const translateY = bob.interpolate({ inputRange: [0, 1], outputRange: [0, -size * 0.05] });
  return (
    <Animated.View
      style={{ width: size, height: size, transform: [{ translateY }, { scale: pop }] }}
    >
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <PipBody mood={mood} blink={blink} antenna={hat === 'nohat' || hat === 'headphones'} />
        <PipHat hat={hat} />
      </Svg>
    </Animated.View>
  );
}

function PipBody({ mood, blink, antenna }: { mood: Mood; blink: boolean; antenna: boolean }) {
  const eye = EYE[mood];
  return (
    <G>
      <Ellipse cx={50} cy={95} rx={22} ry={4} fill="#000" opacity={0.15} />
      {/* Feet */}
      <Rect x={33} y={86} width={12} height={8} rx={4} fill="#4d5f9e" />
      <Rect x={55} y={86} width={12} height={8} rx={4} fill="#4d5f9e" />
      {/* Arms: up in the air when cheering, out to the side when shocked. */}
      {mood === 'cheer' ? (
        <>
          <Rect
            x={13}
            y={38}
            width={9}
            height={22}
            rx={4.5}
            fill="#5c78cf"
            transform="rotate(-25 18 58)"
          />
          <Rect
            x={78}
            y={38}
            width={9}
            height={22}
            rx={4.5}
            fill="#5c78cf"
            transform="rotate(25 82 58)"
          />
        </>
      ) : mood === 'shocked' ? (
        <>
          <Rect x={10} y={52} width={18} height={8} rx={4} fill="#5c78cf" />
          <Rect x={72} y={52} width={18} height={8} rx={4} fill="#5c78cf" />
        </>
      ) : (
        <>
          <Rect x={17} y={55} width={9} height={20} rx={4.5} fill="#5c78cf" />
          <Rect x={74} y={55} width={9} height={20} rx={4.5} fill="#5c78cf" />
        </>
      )}
      {/* Antenna with a spark on top (tucked away under a hat) */}
      {antenna && (
        <>
          <Line
            x1={50}
            y1={30}
            x2={50}
            y2={16}
            stroke="#9aa3b8"
            strokeWidth={3}
            strokeLinecap="round"
          />
          <Circle cx={50} cy={13} r={5} fill={eye} />
          <Circle cx={50} cy={13} r={8} fill={eye} opacity={0.3} />
        </>
      )}
      {/* The battery: + cap, then the blue body */}
      <Rect x={41} y={27} width={18} height={7} rx={2.5} fill="#d9dfeb" />
      <Rect x={24} y={32} width={52} height={58} rx={16} fill="#6f8fe0" />
      <Rect x={24} y={32} width={52} height={14} rx={7} fill="#e9eef9" />
      <Rect x={30} y={36} width={40} height={4} rx={2} fill="#c7d0e4" />
      <Path
        d="M30 52 Q30 50 32 50 L68 50 Q70 50 70 52 L70 76 Q70 80 66 80 L34 80 Q30 80 30 76 Z"
        fill="#2b2740"
      />
      {/* Cheeks */}
      <Circle cx={30} cy={73} r={3.5} fill="#ff9fb2" opacity={0.8} />
      <Circle cx={70} cy={73} r={3.5} fill="#ff9fb2" opacity={0.8} />
      <PipFace mood={mood} blink={blink} eye={eye} />
    </G>
  );
}

function PipFace({ mood, blink, eye }: { mood: Mood; blink: boolean; eye: string }) {
  const glow = <Circle cx={50} cy={62} r={12} fill={eye} opacity={0.22} />;
  if (blink || mood === 'sleepy') {
    return (
      <G>
        <Path
          d="M42 62 Q50 66 58 62"
          stroke={eye}
          strokeWidth={3.5}
          fill="none"
          strokeLinecap="round"
        />
        <Path
          d="M46 73 Q50 74 54 73"
          stroke="#ffffff"
          strokeWidth={2}
          fill="none"
          strokeLinecap="round"
        />
      </G>
    );
  }
  if (mood === 'cheer') {
    return (
      <G>
        {glow}
        <Path
          d="M42 64 Q50 54 58 64"
          stroke={eye}
          strokeWidth={4}
          fill="none"
          strokeLinecap="round"
        />
        <Path d="M43 70 Q50 78 57 70 Z" fill="#ff8fa3" />
      </G>
    );
  }
  if (mood === 'shocked') {
    return (
      <G>
        <Circle cx={50} cy={61} r={15} fill={eye} opacity={0.25} />
        <Circle cx={50} cy={61} r={8.5} fill={eye} />
        <Circle cx={52.5} cy={58.5} r={2.5} fill="#fff" />
        <Ellipse cx={50} cy={74.5} rx={3} ry={3.5} fill="#fff" />
        <Polygon points="76,30 70,40 75,40 69,50" fill="none" stroke="#ffd56b" strokeWidth={2.5} />
        <Polygon points="24,30 30,40 25,40 31,50" fill="none" stroke="#ffd56b" strokeWidth={2.5} />
      </G>
    );
  }
  if (mood === 'worried') {
    return (
      <G>
        {glow}
        <Circle cx={50} cy={63} r={7} fill={eye} />
        <Circle cx={52} cy={61} r={2} fill="#fff" />
        <Path d="M41 54 L57 52" stroke={eye} strokeWidth={2.5} strokeLinecap="round" />
        <Path
          d="M44 75 Q47 72 50 75 Q53 78 56 75"
          stroke="#ffffff"
          strokeWidth={2}
          fill="none"
          strokeLinecap="round"
        />
      </G>
    );
  }
  if (mood === 'thinking') {
    return (
      <G>
        {glow}
        <Circle cx={50} cy={62} r={7} fill={eye} />
        <Circle cx={53} cy={58} r={2.5} fill="#fff" />
        <Path d="M46 74 L54 73" stroke="#ffffff" strokeWidth={2} strokeLinecap="round" />
        <Circle cx={80} cy={22} r={3} fill="#fff" opacity={0.9} />
        <Circle cx={86} cy={14} r={4.5} fill="#fff" opacity={0.9} />
      </G>
    );
  }
  return (
    <G>
      {glow}
      <Circle cx={50} cy={62} r={7.5} fill={eye} />
      <Circle cx={52.5} cy={59.5} r={2.3} fill="#fff" />
      <Path
        d="M44 72 Q50 77 56 72"
        stroke="#ffffff"
        strokeWidth={2.2}
        fill="none"
        strokeLinecap="round"
      />
    </G>
  );
}

export function PipHat({ hat }: { hat: string }) {
  switch (hat) {
    case 'hardhat':
      return (
        <G>
          <Path d="M30 31 Q30 12 50 12 Q70 12 70 31 Z" fill="#ffc93c" />
          <Rect x={24} y={29} width={52} height={6} rx={3} fill="#f0b21f" />
          <Rect x={47} y={12} width={6} height={18} rx={2} fill="#f0b21f" />
        </G>
      );
    case 'party':
      return (
        <G>
          <Polygon points="50,0 36,32 64,32" fill="#ff7eb6" />
          <Path d="M43 16 L57 16 M40 24 L60 24" stroke="#ffd56b" strokeWidth={3} />
          <Circle cx={50} cy={2} r={4} fill="#7fd6ff" />
        </G>
      );
    case 'headphones':
      return (
        <G>
          <Path d="M24 44 Q24 18 50 18 Q76 18 76 44" stroke="#3a3346" strokeWidth={5} fill="none" />
          <Rect x={16} y={38} width={12} height={18} rx={5} fill="#ff6b8b" />
          <Rect x={72} y={38} width={12} height={18} rx={5} fill="#ff6b8b" />
        </G>
      );
    case 'wizard':
      return (
        <G>
          <Polygon points="56,-2 32,32 70,32" fill="#7a5ad6" />
          <Rect x={26} y={28} width={50} height={6} rx={3} fill="#5f43b5" />
          <Polygon
            points="50,12 52,17 57,17 53,20 55,25 50,22 45,25 47,20 43,17 48,17"
            fill="#ffd56b"
          />
        </G>
      );
    case 'crown':
      return (
        <G>
          <Polygon points="32,32 32,14 41,23 50,10 59,23 68,14 68,32" fill="#ffcf3f" />
          <Circle cx={50} cy={24} r={3} fill="#ff5a7a" />
          <Circle cx={39} cy={27} r={2.2} fill="#5fb8ff" />
          <Circle cx={61} cy={27} r={2.2} fill="#5fb8ff" />
        </G>
      );
    default:
      return null;
  }
}
