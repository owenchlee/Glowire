import { describe, expect, it } from 'vitest';

import { ENGINE_VERSION } from './index';

describe('engine scaffold', () => {
  it('is importable from a plain Node test', () => {
    expect(ENGINE_VERSION).toBe('0.0.0');
  });
});
