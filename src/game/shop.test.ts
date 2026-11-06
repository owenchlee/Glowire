import { describe, expect, it } from 'vitest';

import { BOARDS, CATALOGUE, HATS, PETS, WIRES, item, itemOf } from './shop';

describe('shop catalogue helpers', () => {
  it('lists every category in the catalogue', () => {
    for (const list of [PETS, WIRES, BOARDS, HATS]) {
      expect(list.length).toBeGreaterThan(0);
      for (const it of list) expect(CATALOGUE).toContain(it);
    }
  });

  it('keeps each list to its own kind', () => {
    expect(PETS.every((p) => p.kind === 'pet')).toBe(true);
    expect(WIRES.every((w) => w.kind === 'wire')).toBe(true);
    expect(BOARDS.every((b) => b.kind === 'board')).toBe(true);
    expect(HATS.every((h) => h.kind === 'hat')).toBe(true);
  });

  it('gives every pet a known ability and a power blurb', () => {
    for (const p of PETS) {
      expect(['dig', 'wise', 'shiny']).toContain(p.ability);
      expect(p.power.length).toBeGreaterThan(0);
      expect(p.price).toBeGreaterThan(0);
    }
  });

  it('item finds by id, undefined when unknown', () => {
    expect(item('scout')).toBe(PETS.find((p) => p.id === 'scout'));
    expect(item('no-such-thing')).toBeUndefined();
  });

  it('itemOf matches on kind and id together', () => {
    const wire = WIRES[0]!;
    expect(itemOf('wire', wire.id)).toBe(wire);
    expect(itemOf('pet', wire.id)).toBeUndefined();
    expect(itemOf('wire', null)).toBeUndefined();
  });
});
