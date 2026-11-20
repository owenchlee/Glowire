import { describe, expect, it } from 'vitest';
import { chestGameFor, keyHits } from './chestGames';

// Independent FNV-1a so the id -> game mapping is pinned exactly.
const fnv = (s: string) => {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193);
  return h >>> 0;
};

describe('chestGameFor mapping', () => {
  it('maps hash % 3 to open / keyhole / mash', () => {
    const seen = new Set<number>();
    for (let i = 0; i < 60; i++) {
      const id = `chest-${i}`;
      const r = fnv(id) % 3;
      seen.add(r);
      expect(chestGameFor(id, 25)).toBe(r === 0 ? null : r === 1 ? 'keyhole' : 'mash');
    }
    expect(seen.size).toBe(3);
  });
});

describe('keyHits edge', () => {
  it('counts a key exactly on the keyhole edge as a hit', () => {
    expect(keyHits(0.5, 0.25, 0.5)).toBe(true);
    expect(keyHits(0.51, 0.25, 0.5)).toBe(false);
  });
});
