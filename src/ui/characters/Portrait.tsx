// A townsperson's portrait, drawn from their Look (game/cast.ts). Round, friendly, and
// readable at 40 px.

import Svg, { Circle, ClipPath, Defs, Ellipse, G, Path, Polygon, Rect } from 'react-native-svg';

import { type Look, person } from '../../game/cast';
import { Grumble } from './Grumble';
import { Pip } from './Pip';

/** A portrait for any speaker: Pip, Grumble or a townsperson id. */
export function Face({ who, size = 56, hat }: { who: string; size?: number; hat?: string }) {
  if (who === 'pip') return <Pip size={size} still hat={hat} />;
  if (who === 'grumble') return <Grumble size={size} still />;
  return <Portrait look={person(who).look} size={size} />;
}

export function speakerName(who: string): string {
  if (who === 'pip') return 'Pip';
  if (who === 'grumble') return 'Grumble';
  return person(who).name;
}

export function Portrait({ look, size = 56 }: { look: Look; size?: number }) {
  const id = `clip-${look.skin}-${look.hair}-${look.shirt}`.replace(/#/g, '');
  const headR = look.kid ? 21 : 20;
  const headY = look.kid ? 50 : 46;
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <ClipPath id={id}>
          <Circle cx={50} cy={50} r={48} />
        </ClipPath>
      </Defs>
      <Circle cx={50} cy={50} r={48} fill={tint(look.shirt)} />
      <G clipPath={`url(#${id})`}>
        <HairBack look={look} headY={headY} />
        {/* Shoulders and neck */}
        <Path d="M14 104 Q16 76 50 74 Q84 76 86 104 Z" fill={look.shirt} />
        <Rect x={44} y={headY + 12} width={12} height={14} rx={4} fill={look.skin} />
        <Circle cx={50} cy={headY} r={headR} fill={look.skin} />
        {/* Ears */}
        <Circle cx={50 - headR} cy={headY + 2} r={4} fill={look.skin} />
        <Circle cx={50 + headR} cy={headY + 2} r={4} fill={look.skin} />
        {look.beard && (
          <Path
            d={`M${50 - headR + 3} ${headY + 2} Q50 ${headY + headR + 12} ${50 + headR - 3} ${headY + 2} Q50 ${headY + 14} ${50 - headR + 3} ${headY + 2} Z`}
            fill={look.hair}
          />
        )}
        {/* Face */}
        <Circle cx={42} cy={headY + 1} r={2.6} fill="#2b2433" />
        <Circle cx={58} cy={headY + 1} r={2.6} fill="#2b2433" />
        <Circle cx={36} cy={headY + 8} r={3.5} fill="#ff8fa3" opacity={0.45} />
        <Circle cx={64} cy={headY + 8} r={3.5} fill="#ff8fa3" opacity={0.45} />
        <Path
          d={`M44 ${headY + 9} Q50 ${headY + 14} 56 ${headY + 9}`}
          stroke="#7a3b3b"
          strokeWidth={2.2}
          fill="none"
          strokeLinecap="round"
        />
        {look.freckles && (
          <G fill="#c47a52">
            <Circle cx={39} cy={headY + 6} r={0.9} />
            <Circle cx={42} cy={headY + 7.5} r={0.9} />
            <Circle cx={58} cy={headY + 7.5} r={0.9} />
            <Circle cx={61} cy={headY + 6} r={0.9} />
          </G>
        )}
        {look.glasses && (
          <G stroke="#3a3346" strokeWidth={1.8} fill="none">
            <Circle cx={42} cy={headY + 1} r={6} />
            <Circle cx={58} cy={headY + 1} r={6} />
            <Path d={`M48 ${headY + 1} L52 ${headY + 1}`} />
          </G>
        )}
        <HairFront look={look} headY={headY} r={headR} />
        <HatShape look={look} headY={headY} r={headR} />
      </G>
    </Svg>
  );
}

/** A soft version of the shirt colour for the background. */
function tint(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  const mix = (c: number) => Math.round(c + (255 - c) * 0.72);
  const r = mix((n >> 16) & 255);
  const g = mix((n >> 8) & 255);
  const b = mix(n & 255);
  return `rgb(${r},${g},${b})`;
}

function HairBack({ look, headY }: { look: Look; headY: number }) {
  switch (look.hairStyle) {
    case 'long':
      return <Rect x={27} y={headY - 10} width={46} height={44} rx={16} fill={look.hair} />;
    case 'afro':
      return <Circle cx={50} cy={headY - 4} r={30} fill={look.hair} />;
    case 'ponytail':
      return <Ellipse cx={76} cy={headY + 8} rx={8} ry={16} fill={look.hair} />;
    case 'bun':
      return <Circle cx={50} cy={headY - 24} r={10} fill={look.hair} />;
    default:
      return null;
  }
}

function HairFront({ look, headY, r }: { look: Look; headY: number; r: number }) {
  const top = headY - r;
  const cap = `M${50 - r - 1} ${headY} Q${50 - r} ${top - 4} 50 ${top - 3} Q${50 + r} ${top - 4} ${50 + r + 1} ${headY} Q${50 + r - 6} ${top + 6} 50 ${top + 8} Q${50 - r + 6} ${top + 6} ${50 - r - 1} ${headY} Z`;
  switch (look.hairStyle) {
    case 'bald':
      return (
        <G fill={look.hair}>
          <Ellipse cx={50 - r + 2} cy={headY - 2} rx={4} ry={7} />
          <Ellipse cx={50 + r - 2} cy={headY - 2} rx={4} ry={7} />
        </G>
      );
    case 'curly':
      return (
        <G fill={look.hair}>
          {[-18, -9, 0, 9, 18].map((dx) => (
            <Circle key={dx} cx={50 + dx} cy={top + 2 + Math.abs(dx) / 3} r={8} />
          ))}
          <Circle cx={50 - r + 1} cy={headY - 6} r={6} />
          <Circle cx={50 + r - 1} cy={headY - 6} r={6} />
        </G>
      );
    case 'spiky':
      return (
        <Polygon
          points={`${50 - r},${headY - 2} ${50 - r + 2},${top - 6} ${42},${top + 2} ${46},${top - 9} ${52},${top + 1} ${56},${top - 9} ${59},${top + 2} ${50 + r - 2},${top - 6} ${50 + r},${headY - 2} ${50 + r - 6},${top + 8} ${50 - r + 6},${top + 8}`}
          fill={look.hair}
        />
      );
    case 'afro':
      return <Path d={cap} fill={look.hair} />;
    case 'bob':
      return (
        <G fill={look.hair}>
          <Path d={cap} />
          <Rect x={50 - r - 3} y={headY - 6} width={9} height={22} rx={4} />
          <Rect x={50 + r - 6} y={headY - 6} width={9} height={22} rx={4} />
        </G>
      );
    default:
      return <Path d={cap} fill={look.hair} />;
  }
}

function HatShape({ look, headY, r }: { look: Look; headY: number; r: number }) {
  const top = headY - r;
  const c = look.hatColor ?? '#555';
  switch (look.hat) {
    case 'cap':
      return (
        <G>
          <Path d={`M${50 - r} ${top + 9} Q50 ${top - 12} ${50 + r} ${top + 9} Z`} fill={c} />
          <Rect x={50} y={top + 6} width={r + 10} height={5} rx={2.5} fill={c} />
        </G>
      );
    case 'chef':
      return (
        <G fill="#ffffff">
          <Rect x={50 - r + 4} y={top - 6} width={2 * r - 8} height={14} rx={3} />
          <Circle cx={40} cy={top - 10} r={9} />
          <Circle cx={50} cy={top - 14} r={10} />
          <Circle cx={60} cy={top - 10} r={9} />
        </G>
      );
    case 'captain':
      return (
        <G>
          <Path
            d={`M${50 - r - 2} ${top + 6} L${50 - r + 2} ${top - 8} L${50 + r - 2} ${top - 8} L${50 + r + 2} ${top + 6} Z`}
            fill={c}
          />
          <Rect x={50 - r - 2} y={top + 3} width={2 * r + 4} height={6} rx={2} fill="#22324d" />
          <Circle cx={50} cy={top - 1} r={3.5} fill="#f2c94c" />
        </G>
      );
    case 'police':
      return (
        <G>
          <Path
            d={`M${50 - r - 1} ${top + 6} Q50 ${top - 14} ${50 + r + 1} ${top + 6} Z`}
            fill={c}
          />
          <Rect x={50 - r - 2} y={top + 3} width={2 * r + 4} height={6} rx={2} fill="#1b2747" />
          <Polygon
            points={`50,${top - 6} 53,${top - 1} 50,${top + 3} 47,${top - 1}`}
            fill="#f2c94c"
          />
        </G>
      );
    case 'beanie':
      return (
        <G>
          <Path
            d={`M${50 - r - 1} ${top + 8} Q50 ${top - 16} ${50 + r + 1} ${top + 8} Z`}
            fill={c}
          />
          <Rect
            x={50 - r - 2}
            y={top + 4}
            width={2 * r + 4}
            height={7}
            rx={3}
            fill={c}
            opacity={0.85}
          />
          <Circle cx={50} cy={top - 8} r={5} fill="#ffffff" />
        </G>
      );
    case 'top':
      return (
        <G fill={c}>
          <Rect x={50 - r + 2} y={top - 24} width={2 * r - 4} height={28} rx={3} />
          <Rect x={50 - r - 6} y={top + 1} width={2 * r + 12} height={5} rx={2.5} />
          <Rect x={50 - r + 2} y={top - 6} width={2 * r - 4} height={4} fill="#c94f6d" />
        </G>
      );
    case 'flower':
      return (
        <G>
          {[0, 72, 144, 216, 288].map((a) => (
            <Circle
              key={a}
              cx={70 + 5 * Math.cos((a * Math.PI) / 180)}
              cy={top + 4 + 5 * Math.sin((a * Math.PI) / 180)}
              r={4}
              fill="#ff7eb6"
            />
          ))}
          <Circle cx={70} cy={top + 4} r={3} fill="#ffd56b" />
        </G>
      );
    default:
      return null;
  }
}
