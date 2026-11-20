import { describe, expect, it } from 'vitest';

import { createBoard, drawSegment } from './board';

describe('drawSegment between cells that are not neighbours', () => {
  it('changes nothing and does not report running out of wire', () => {
    const s = createBoard(4, 1);
    const result = drawSegment(s, 0, 2, 0);
    expect(result.state).toBe(s);
    expect(result.outOfWire).toBe(false);
  });
});
