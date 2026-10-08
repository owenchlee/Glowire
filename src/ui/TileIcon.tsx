// Flat 2D picture of a tile, drawn from its ports, for the tray and the drag preview.

import { StyleSheet, Text, View } from 'react-native';

import { type Direction, type Tile, type TwoTerminalTile, getPorts, getTerminals } from '../engine';
import { COLORS, resistorBands } from '../render/theme';

const BASE_COLOR: Record<Tile['kind'], string> = {
  wire: COLORS.wireBase,
  resistor: COLORS.resistorBase,
  led: COLORS.ledBase,
  battery: COLORS.batteryBase,
  switch: COLORS.switchBase,
  block: COLORS.blockStone,
};

export function TileIcon({ tile, size = 52 }: { tile: Tile; size?: number }) {
  const ports = getPorts(tile);
  const horizontal = ports.includes(1) || ports.includes(3);
  const th = Math.round(size * 0.15);
  return (
    <View
      style={[
        styles.base,
        {
          width: size,
          height: size,
          borderRadius: size * 0.22,
          backgroundColor: BASE_COLOR[tile.kind],
        },
      ]}
    >
      {ports.map((d) => (
        <View key={d} style={[styles.wire, armStyle(d, size, th)]} />
      ))}
      {tile.kind === 'wire' && (
        <View
          style={[
            styles.wire,
            {
              width: th * 1.3,
              height: th * 1.3,
              borderRadius: th,
              left: (size - th * 1.3) / 2,
              top: (size - th * 1.3) / 2,
            },
          ]}
        />
      )}
      {tile.kind === 'resistor' && (
        <View
          style={[
            styles.resistor,
            horizontal
              ? { width: size * 0.58, height: size * 0.28, flexDirection: 'row' }
              : { width: size * 0.28, height: size * 0.58, flexDirection: 'column' },
          ]}
        >
          {resistorBands(tile.ohms).map((c, i) => (
            <View
              key={i}
              style={
                horizontal
                  ? { width: size * 0.06, height: '100%', backgroundColor: c }
                  : { height: size * 0.06, width: '100%', backgroundColor: c }
              }
            />
          ))}
        </View>
      )}
      {tile.kind === 'battery' && (
        <View
          style={[
            styles.battery,
            horizontal
              ? { width: size * 0.62, height: size * 0.36 }
              : { width: size * 0.36, height: size * 0.62 },
          ]}
        />
      )}
      {tile.kind === 'led' && (
        <>
          <View
            style={[
              styles.led,
              { width: size * 0.42, height: size * 0.42, borderRadius: size * 0.21 },
            ]}
          />
          <Polarity tile={tile} size={size} />
        </>
      )}
    </View>
  );
}

function Polarity({ tile, size }: { tile: TwoTerminalTile; size: number }) {
  const [plus, minus] = getTerminals(tile);
  return (
    <>
      <Text style={[styles.mark, markStyle(plus, size)]}>+</Text>
      <Text style={[styles.mark, markStyle(minus, size)]}>−</Text>
    </>
  );
}

/** A '+' or '−' tucked into the corner next to that terminal. */
function markStyle(d: Direction, size: number) {
  const near = size * 0.04;
  const far = size * 0.62;
  switch (d) {
    case 0:
      return { top: near, left: far };
    case 1:
      return { top: far, right: near };
    case 2:
      return { bottom: near, left: far };
    case 3:
      return { top: far, left: near };
  }
}

function armStyle(d: Direction, size: number, th: number) {
  const half = size / 2;
  const mid = (size - th) / 2;
  switch (d) {
    case 0:
      return { left: mid, top: 0, width: th, height: half };
    case 1:
      return { left: half, top: mid, width: half, height: th };
    case 2:
      return { left: mid, top: half, width: th, height: half };
    case 3:
      return { left: 0, top: mid, width: half, height: th };
  }
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'rgba(90,70,120,0.15)',
  },
  wire: { position: 'absolute', backgroundColor: COLORS.wire, borderRadius: 3 },
  resistor: {
    backgroundColor: COLORS.resistorBody,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  battery: { backgroundColor: COLORS.batteryBody, borderRadius: 8 },
  led: { backgroundColor: COLORS.ledRed },
  mark: {
    position: 'absolute',
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.marking,
    lineHeight: 12,
  },
});
