import { describe, expect, it } from 'vitest';
import { NEW_SAVE } from './save';

describe('new save defaults', () => {
  it('starts with sound on', () => {
    expect(NEW_SAVE.muted).toBe(false);
  });
});
