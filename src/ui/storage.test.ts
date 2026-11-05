import { beforeEach, describe, expect, it } from 'vitest';
import { loadSave, writeSave } from './storage.web';

const store = new Map<string, string>();
Object.assign(globalThis, {
  localStorage: {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
  },
});

beforeEach(() => store.clear());

describe('web save storage', () => {
  it('returns null when nothing is saved', () => {
    expect(loadSave()).toBeNull();
  });

  it('round-trips what it writes', () => {
    writeSave({ version: 2, sparks: 5 });
    expect(loadSave()).toEqual({ version: 2, sparks: 5 });
  });

  it('keeps a copy of a corrupt save instead of losing it', () => {
    store.set('glowire-save', '{"version":2,"sparks":');
    expect(loadSave()).toBeNull();
    expect(store.get('glowire-save-corrupt')).toBe('{"version":2,"sparks":');
  });

  it('never throws when storage itself fails', () => {
    Object.assign(globalThis, { localStorage: { getItem: () => { throw new Error('no'); }, setItem: () => { throw new Error('no'); } } });
    expect(loadSave()).toBeNull();
    expect(() => writeSave({})).not.toThrow();
  });
});
