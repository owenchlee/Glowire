// Buildings on the town map. Dark until their job is solved, then the windows glow.

import Svg, {
  Circle,
  Defs,
  Ellipse,
  G,
  Line,
  Path,
  Polygon,
  RadialGradient,
  Rect,
  Stop,
} from 'react-native-svg';

import type { BuildingKind } from '../../levels/types';

const NIGHT = [29, 27, 58]; // #1d1b3a

/** Mix a colour towards the night sky when the building is dark. */
function shade(hex: string, lit: boolean): string {
  if (lit) return hex;
  const n = parseInt(hex.slice(1), 16);
  const mix = (c: number, i: number) => Math.round(c * 0.38 + NIGHT[i]! * 0.62);
  return `rgb(${mix((n >> 16) & 255, 0)},${mix((n >> 8) & 255, 1)},${mix(n & 255, 2)})`;
}

const WALLS = ['#f4c7a1', '#c9e4f7', '#f7d6e6', '#d9f0c9', '#f2e3b3', '#e0d4f5', '#ffd7b0'];

export function Building({
  kind,
  lit,
  variant = 0,
  size = 96,
}: {
  kind: BuildingKind;
  lit: boolean;
  /** Picks the wall colour, so a street of houses isn't all one colour. */
  variant?: number;
  size?: number;
}) {
  const c = (hex: string) => shade(hex, lit);
  const wall = c(WALLS[variant % WALLS.length]!);
  const win = lit ? '#ffd56b' : '#2f2c4a';
  const glowId = `glow-${kind}-${variant}`;
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <RadialGradient id={glowId} cx="50%" cy="60%" r="50%">
          <Stop offset="0%" stopColor="#ffd56b" stopOpacity={0.55} />
          <Stop offset="100%" stopColor="#ffd56b" stopOpacity={0} />
        </RadialGradient>
      </Defs>
      {lit && <Circle cx={50} cy={58} r={50} fill={`url(#${glowId})`} />}
      <Ellipse cx={50} cy={93} rx={38} ry={5} fill="#000" opacity={0.18} />
      <Shape kind={kind} c={c} wall={wall} win={win} lit={lit} />
    </Svg>
  );
}

type Paint = (hex: string) => string;

function Window({
  x,
  y,
  w = 10,
  h = 12,
  win,
}: {
  x: number;
  y: number;
  w?: number;
  h?: number;
  win: string;
}) {
  return (
    <G>
      <Rect x={x} y={y} width={w} height={h} rx={2} fill={win} />
      <Line x1={x + w / 2} y1={y} x2={x + w / 2} y2={y + h} stroke="#00000022" strokeWidth={1.2} />
    </G>
  );
}

function Shape({
  kind,
  c,
  wall,
  win,
  lit,
}: {
  kind: BuildingKind;
  c: Paint;
  wall: string;
  win: string;
  lit: boolean;
}) {
  switch (kind) {
    case 'house':
      return (
        <G>
          <Rect x={64} y={22} width={8} height={18} fill={c('#b06a5a')} />
          <Rect x={20} y={46} width={60} height={46} rx={3} fill={wall} />
          <Polygon points="14,49 50,18 86,49" fill={c('#d0675a')} />
          <Rect x={44} y={68} width={13} height={24} rx={2} fill={c('#8a5a3c')} />
          <Window x={26} y={56} w={13} h={13} win={win} />
          <Window x={62} y={56} w={13} h={13} win={win} />
        </G>
      );
    case 'cottage':
      return (
        <G>
          <Rect x={16} y={52} width={68} height={40} rx={4} fill={wall} />
          <Path d="M10 56 Q50 14 90 56 Z" fill={c('#7c9c5a')} />
          <Circle cx={50} cy={44} r={6} fill={win} />
          <Rect x={42} y={68} width={15} height={24} rx={7} fill={c('#6e8fbf')} />
          <Window x={22} y={64} w={13} h={12} win={win} />
          <Window x={66} y={64} w={13} h={12} win={win} />
          {/* The porch light */}
          <Circle cx={62} cy={66} r={2.6} fill={lit ? '#fff3b8' : '#4a4660'} />
          {lit && <Circle cx={62} cy={66} r={7} fill="#fff3b8" opacity={0.4} />}
        </G>
      );
    case 'shop':
      return (
        <G>
          <Rect x={14} y={38} width={72} height={54} rx={3} fill={wall} />
          <Rect x={18} y={26} width={64} height={14} rx={3} fill={c('#4a3f63')} />
          <Rect x={24} y={30} width={52} height={6} rx={3} fill={lit ? '#7dffb4' : '#3a3654'} />
          <Path d="M12 42 L88 42 L84 54 L16 54 Z" fill={c('#ff8fa3')} />
          <Path
            d="M24 42 L22 54 M38 42 L37 54 M52 42 L52 54 M66 42 L67 54 M78 42 L80 54"
            stroke={c('#ffffff')}
            strokeWidth={5}
          />
          <Rect x={20} y={60} width={36} height={22} rx={2} fill={win} />
          <Rect x={62} y={60} width={16} height={32} rx={2} fill={c('#8a5a3c')} />
        </G>
      );
    case 'cafe':
      return (
        <G>
          <Rect x={16} y={42} width={68} height={50} rx={3} fill={wall} />
          <Path d="M12 44 Q50 22 88 44 Z" fill={c('#9b6b4b')} />
          <Circle cx={50} cy={30} r={11} fill={lit ? '#9fd4ff' : '#34314f'} />
          <Path d="M45 30 Q50 22 55 30" stroke={c('#ffffff')} strokeWidth={2} fill="none" />
          <Rect x={22} y={56} width={22} height={18} rx={9} fill={win} />
          <Rect x={56} y={56} width={22} height={18} rx={9} fill={win} />
          <Rect x={44} y={76} width={12} height={16} rx={2} fill={c('#6b4a35')} />
        </G>
      );
    case 'school':
      return (
        <G>
          <Rect x={8} y={44} width={84} height={48} rx={3} fill={wall} />
          <Polygon points="36,44 50,20 64,44" fill={c('#c9574f')} />
          <Circle cx={50} cy={36} r={5} fill={lit ? '#ffffff' : '#3a3654'} />
          <Rect x={8} y={42} width={84} height={6} fill={c('#c9574f')} />
          {[14, 30, 60, 76].map((x) => (
            <Window key={x} x={x} y={54} w={11} h={13} win={win} />
          ))}
          <Rect x={43} y={66} width={14} height={26} rx={2} fill={c('#5b4e6e')} />
        </G>
      );
    case 'signal':
      return (
        <G>
          <Rect x={46} y={46} width={8} height={46} fill={c('#6d6680')} />
          <Rect x={34} y={10} width={32} height={44} rx={8} fill={c('#3a3346')} />
          <Circle cx={50} cy={20} r={6} fill={lit ? '#ff5a5f' : '#4b3b4a'} />
          <Circle cx={50} cy={32} r={6} fill={lit ? '#ffd56b' : '#4b473a'} />
          <Circle cx={50} cy={44} r={6} fill={lit ? '#3fcf7f' : '#3a4a42'} />
          <Rect x={30} y={88} width={40} height={5} rx={2} fill={c('#8d86a0')} />
        </G>
      );
    case 'tower':
      return (
        <G>
          <Rect x={30} y={22} width={40} height={70} rx={3} fill={wall} />
          <Polygon points="26,24 50,4 74,24" fill={c('#5f6fbf')} />
          {[32, 50, 68].map((y) => (
            <Window key={y} x={44} y={y} w={12} h={11} win={win} />
          ))}
        </G>
      );
    case 'lighthouse':
      return (
        <G>
          {lit && <Polygon points="50,18 100,4 100,30" fill="#fff3b8" opacity={0.45} />}
          {lit && <Polygon points="50,18 0,4 0,30" fill="#fff3b8" opacity={0.3} />}
          <Polygon points="36,92 42,30 58,30 64,92" fill={c('#f7f2ea')} />
          <Polygon points="39,72 41,56 59,56 61,72" fill={c('#e05a55')} />
          <Polygon points="37,92 38,84 62,84 63,92" fill={c('#e05a55')} />
          <Rect x={38} y={14} width={24} height={16} rx={3} fill={lit ? '#fff3b8' : '#38354f'} />
          <Polygon points="34,16 50,4 66,16" fill={c('#e05a55')} />
          <Rect x={36} y={28} width={28} height={4} fill={c('#3a3346')} />
          <Window x={46} y={40} w={8} h={10} win={win} />
        </G>
      );
    case 'boat':
      return (
        <G>
          <Path
            d="M0 90 Q12 84 25 90 T50 90 T75 90 T100 90 L100 100 L0 100 Z"
            fill={c('#3d6a9e')}
          />
          <Line x1={50} y1={14} x2={50} y2={66} stroke={c('#8a6d55')} strokeWidth={3} />
          <Path d="M50 16 L22 58 L50 58 Z" fill={c('#f7f2ea')} />
          {/* String lights from the mast */}
          <Path d="M50 16 Q66 40 86 70" stroke={c('#5b4e6e')} strokeWidth={1} fill="none" />
          {[0.25, 0.5, 0.75].map((t) => (
            <Circle
              key={t}
              cx={50 + 36 * t}
              cy={16 + 54 * t + 8 * Math.sin(t * Math.PI)}
              r={3}
              fill={lit ? ['#ff8fa3', '#ffd56b', '#7fd6ff'][t * 4 - 1] : '#3a3654'}
            />
          ))}
          <Path d="M12 70 L88 70 L78 88 L22 88 Z" fill={c('#e86f5a')} />
          <Rect x={36} y={58} width={26} height={12} rx={2} fill={wall} />
          <Window x={42} y={60} w={8} h={7} win={win} />
          <Window x={52} y={60} w={8} h={7} win={win} />
        </G>
      );
    case 'warehouse':
      return (
        <G>
          <Rect x={10} y={44} width={80} height={48} rx={2} fill={c('#9fb3c8')} />
          <Polygon points="6,46 50,20 94,46" fill={c('#5c7187')} />
          <Rect x={30} y={58} width={40} height={34} fill={c('#7b8ea3')} />
          {[64, 72, 80].map((y) => (
            <Line key={y} x1={30} y1={y} x2={70} y2={y} stroke={c('#5c7187')} strokeWidth={2} />
          ))}
          <Window x={14} y={52} w={11} h={10} win={win} />
          <Window x={75} y={52} w={11} h={10} win={win} />
          <Circle cx={50} cy={36} r={5} fill={win} />
        </G>
      );
    case 'clock':
      return (
        <G>
          <Rect x={28} y={30} width={44} height={62} rx={3} fill={c('#c8b7a6')} />
          <Polygon points="24,32 50,4 76,32" fill={c('#6b5a8e')} />
          <Circle cx={50} cy={48} r={14} fill={lit ? '#fff6d6' : '#3c3852'} />
          <Circle cx={50} cy={48} r={14} fill="none" stroke={c('#6b5a8e')} strokeWidth={3} />
          <Line
            x1={50}
            y1={48}
            x2={50}
            y2={39}
            stroke="#3a3346"
            strokeWidth={2.5}
            strokeLinecap="round"
          />
          <Line
            x1={50}
            y1={48}
            x2={57}
            y2={51}
            stroke="#3a3346"
            strokeWidth={2.5}
            strokeLinecap="round"
          />
          <Rect x={43} y={74} width={14} height={18} rx={7} fill={c('#5b4e6e')} />
        </G>
      );
    case 'workshop':
      return (
        <G>
          <Rect x={14} y={46} width={72} height={46} rx={3} fill={wall} />
          <Polygon points="8,50 30,28 70,28 92,50" fill={c('#7a5ad6')} />
          <Circle cx={50} cy={39} r={8} fill={lit ? '#ffd56b' : '#3a3654'} />
          <Polygon points="50,33 46,40 50,40 48,46 54,38 50,38" fill={c('#3a3346')} />
          <Rect x={22} y={60} width={24} height={32} rx={2} fill={c('#8a6d55')} />
          <Window x={56} y={58} w={22} h={16} win={win} />
        </G>
      );
    case 'station':
      return (
        <G>
          <Rect x={20} y={16} width={10} height={36} fill={c('#8d86a0')} />
          <Rect x={70} y={22} width={10} height={30} fill={c('#8d86a0')} />
          <Rect x={10} y={46} width={80} height={46} rx={3} fill={c('#b9b3c4')} />
          <Polygon
            points="50,52 40,72 50,72 44,90 62,66 52,66 58,52"
            fill={lit ? '#ffd56b' : '#3f3b55'}
          />
          <Window x={16} y={56} w={14} h={12} win={win} />
          <Window x={70} y={56} w={14} h={12} win={win} />
        </G>
      );
    case 'treehouse':
      return (
        <G>
          <Rect x={44} y={50} width={12} height={42} rx={3} fill={c('#8a5a3c')} />
          <Circle cx={30} cy={40} r={20} fill={c('#5a9e5a')} />
          <Circle cx={70} cy={40} r={20} fill={c('#5a9e5a')} />
          <Circle cx={50} cy={28} r={22} fill={c('#6cb46a')} />
          <Rect x={32} y={38} width={36} height={24} rx={2} fill={c('#c99a6c')} />
          <Polygon points="28,40 50,24 72,40" fill={c('#a0522d')} />
          <Window x={44} y={44} w={12} h={11} win={win} />
          <Line x1={60} y1={62} x2={60} y2={92} stroke={c('#c99a6c')} strokeWidth={2} />
          <Line x1={66} y1={62} x2={66} y2={92} stroke={c('#c99a6c')} strokeWidth={2} />
          {[70, 78, 86].map((y) => (
            <Line key={y} x1={60} y1={y} x2={66} y2={y} stroke={c('#c99a6c')} strokeWidth={2} />
          ))}
        </G>
      );
  }
}
