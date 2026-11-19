import { expect, it } from 'vitest';
import { dropGap } from './games';

it('dropGap starts at 0.75 and floors at 0.32', () => {
  expect(dropGap(0)).toBeCloseTo(0.75, 5);
  expect(dropGap(90)).toBeCloseTo(0.32, 5);
  expect(dropGap(1000)).toBeCloseTo(0.32, 5);
});
