import { describe, expect, it } from 'vitest';
import { CAST } from './cast';
import { PERSON_SECRETS, SECRETS, secretKey, secretsIn } from './lore';
import { PROLOGUE, SCENES, sceneOf } from './story';

describe('lore helpers', () => {
  it('secretKey namespaces the id', () => {
    expect(secretKey('who:gran')).toBe('secret:who:gran');
  });

  it('secretsIn returns only that world, and the worlds partition all secrets', () => {
    const worlds = ['glowtown', 'harbour', 'mossbell', 'deep'] as const;
    for (const w of worlds) {
      for (const s of secretsIn(w)) expect(s.world).toBe(w);
    }
    const total = worlds.reduce((n, w) => n + secretsIn(w).length, 0);
    expect(total).toBe(Object.keys(SECRETS).length);
    expect(secretsIn('nowhere')).toEqual([]);
  });

  it('PERSON_SECRETS point at real people, secrets and scenes', () => {
    for (const [who, p] of Object.entries(PERSON_SECRETS)) {
      if (who !== 'pip' && who !== 'grumble') expect(CAST[who], who).toBeDefined(); // the two companions are not in CAST
      expect(SECRETS[p.secret], p.secret).toBeDefined();
      if (p.afterScene) expect(SCENES[p.afterScene], p.afterScene).toBeDefined();
    }
  });
});

describe('story helpers', () => {
  it('sceneOf looks scenes up by id', () => {
    expect(sceneOf('prologue')).toBe(PROLOGUE);
    expect(sceneOf('no-such-scene')).toBeUndefined();
  });

  it('PROLOGUE is registered and has dialogue', () => {
    expect(SCENES[PROLOGUE.id]).toBe(PROLOGUE);
    expect(PROLOGUE.lines.length).toBeGreaterThan(0);
  });
});
