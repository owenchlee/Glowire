import { describe, expect, it } from 'vitest';

import { type TileResult, led } from '../engine';
import { tileTag } from './levelParts';

const res = (p: Partial<TileResult>) => ({ current: 0, status: 'OK', ...p }) as TileResult;

describe('LED current tag threshold', () => {
  it('hides a current of exactly 0.1 mA but shows one just above it', () => {
    expect(tileTag(led(), res({ current: 1e-4 }), 'L1', 1, 0)).toBeNull();
    expect(tileTag(led(), res({ current: 1.1e-4 }), 'L1', 1, 0)?.text).toBeTruthy();
  });
});
