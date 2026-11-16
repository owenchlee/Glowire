import { describe, expect, it } from 'vitest';

import { worldMap } from '../world/worlds';
import { surfaceAt } from './surface';

describe('surfaceAt', () => {
  const town = worldMap('glowtown')!;
  const harbour = worldMap('harbour')!;
  const deep = worldMap('deep')!;

  it('reads painted terrain', () => {
    expect(surfaceAt(town, 15, 25)).toBe('dirt'); // the lane west of the square
    expect(surfaceAt(town, 42, 35)).toBe('water'); // the pond
    expect(surfaceAt(harbour, 50, 31)).toBe('sand'); // the beach
    expect(surfaceAt(harbour, 4, 25)).toBe('stone'); // asphalt road in from the west
    expect(surfaceAt(harbour, 50, 10)).toBe('sand'); // top of the sandy terrace
  });

  it('puts bridges and stepping stones over the ground', () => {
    expect(surfaceAt(town, 39, 32)).toBe('stone'); // stepping stones across the pond
    expect(surfaceAt(town, 48, 24)).toBe('wood'); // boardwalk
    expect(surfaceAt(harbour, 28, 30)).toBe('wood'); // jetty over the sea
  });

  it('finds grass, and copes with the edges', () => {
    expect(surfaceAt(town, 0, 25)).toBe('grass');
    expect(surfaceAt(town, -1, 0)).toBe('grass');
    expect(surfaceAt(town, 15.7, 25.2)).toBe('dirt'); // fractional positions floor to their cell
    expect(surfaceAt(deep, deep.spawn.x, deep.spawn.y)).toBe('sand'); // seabed
  });

  it('hears every kind of walkable ground the harbour has', () => {
    const seen = new Set<string>();
    for (let y = 0; y < harbour.height; y++)
      for (let x = 0; x < harbour.width; x++)
        if (!harbour.solid[y * harbour.width + x]) seen.add(surfaceAt(harbour, x, y));
    expect([...seen].sort()).toEqual(['dirt', 'grass', 'sand', 'stone', 'wood']);
  });
});
