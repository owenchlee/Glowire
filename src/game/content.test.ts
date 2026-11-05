import { describe, expect, it } from 'vitest';

import { CAST } from './cast';
import { PERSON_SECRETS, SECRETS, earnedPuzzleSecrets, puzzleSecrets, secretKey, secretsIn } from './lore';
import { BOARDS, CATALOGUE, HATS, PETS, WIRES, item, itemOf, outfitSprite } from './shop';
import { NOTES, SCENES, sceneOf } from './story';

const speakerOk = (who: string) => who === 'pip' || who === 'grumble' || !!CAST[who];

describe('story data', () => {
  it('keys match ids, and no scene or note is empty or has a blank line', () => {
    for (const [key, s] of Object.entries(SCENES)) {
      expect(s.id, key).toBe(key);
      expect(s.lines.length, key).toBeGreaterThan(0);
      for (const l of s.lines) expect(l.text.trim(), key).not.toBe('');
    }
    for (const [key, n] of Object.entries(NOTES)) {
      expect(n.id).toBe(key);
      expect(n.lines.length, key).toBeGreaterThan(0);
      for (const l of n.lines) expect(l.text.trim(), key).not.toBe('');
    }
  });

  it('sceneOf finds a scene and returns undefined for a missing one', () => {
    expect(sceneOf('prologue')).toBe(SCENES.prologue);
    expect(sceneOf('no-such-scene')).toBeUndefined();
  });
});

describe('lore data', () => {
  it('keys match ids and every speaker, world and about-person exists', () => {
    for (const [key, s] of Object.entries(SECRETS)) {
      expect(s.id).toBe(key);
      expect(['glowtown', 'harbour', 'mossbell', 'deep'], key).toContain(s.world);
      expect(s.lines.length, key).toBeGreaterThan(0);
      for (const l of s.lines) expect(speakerOk(l.who), `${key}: ${l.who}`).toBe(true);
      if (s.about) expect(speakerOk(s.about), `${key} about ${s.about}`).toBe(true);
    }
  });

  it('every person secret points at a real secret, a real scene and a real person', () => {
    for (const [who, ps] of Object.entries(PERSON_SECRETS)) {
      expect(speakerOk(who), who).toBe(true);
      expect(SECRETS[ps.secret], ps.secret).toBeDefined();
      if (ps.afterScene) expect(SCENES[ps.afterScene], ps.afterScene).toBeDefined();
    }
  });

  it('secretsIn only returns that world’s secrets, and nothing for an unknown world', () => {
    for (const w of ['glowtown', 'harbour', 'mossbell', 'deep']) {
      for (const s of secretsIn(w)) expect(s.world).toBe(w);
    }
    expect(secretsIn('nowhere')).toEqual([]);
  });

  it('earnedPuzzleSecrets needs the score, ignores other games, and skips ones already seen', () => {
    const [first] = puzzleSecrets();
    const { game, score } = first!.unlock!;
    expect(earnedPuzzleSecrets({ [game]: score - 1 }, [], game)).not.toContain(first);
    expect(earnedPuzzleSecrets({ [game]: score }, [], game)).toContain(first);
    expect(earnedPuzzleSecrets({ [game]: score }, [], 'other-game')).toEqual([]);
    expect(earnedPuzzleSecrets({ [game]: score }, [secretKey(first!.id)], game)).not.toContain(first);
    // every secret filtered by `game` really belongs to that game
    for (const s of earnedPuzzleSecrets({ [game]: 1e9 }, [], game)) expect(s.unlock!.game).toBe(game);
  });
});

describe('shop data', () => {
  it('has no negative or fractional prices and a free default of every wearable kind', () => {
    for (const i of CATALOGUE) expect(Number.isInteger(i.price) && i.price >= 0, i.id).toBe(true);
    for (const list of [WIRES, BOARDS, HATS]) expect(list.some((i) => i.price === 0)).toBe(true);
    expect(CATALOGUE.some((i) => i.kind === 'outfit' && i.price === 0)).toBe(true);
  });

  it('pets are never free and each has a distinct ability', () => {
    for (const p of PETS) expect(p.price).toBeGreaterThan(0);
    expect(new Set(PETS.map((p) => p.ability)).size).toBe(PETS.length);
  });

  it('item finds by id; itemOf also checks the kind and accepts null', () => {
    expect(item('gold')?.kind).toBe('wire');
    expect(item('nope')).toBeUndefined();
    expect(itemOf('wire', 'gold')?.id).toBe('gold');
    expect(itemOf('board', 'gold')).toBeUndefined(); // right id, wrong kind
    expect(itemOf('pet', null)).toBeUndefined();
  });

  it('outfitSprite maps the starter uniform to "hero" and others to hero-<id>', () => {
    expect(outfitSprite('uniform')).toBe('hero');
    expect(outfitSprite('ember')).toBe('hero-ember');
  });
});
