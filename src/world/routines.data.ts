// Who does what, by world id and resident key (`who@x,y`, the spot they are placed at in the
// map). Waypoints must stay on open ground: routines.test.ts walks every leg on every map.

import type { Routine } from './routines';

const pace = (x1: number, y1: number, x2: number, y2: number, extra: Partial<Routine> = {}): Routine => ({
  path: [
    { x: x1, y: y1 },
    { x: x2, y: y2 },
  ],
  ...extra,
});

export const ROUTINES: Record<string, Record<string, Routine>> = {
  glowtown: {
    'wren@37,14': pace(33, 14, 40, 14, { night: 'hide' }),
    'wren@76,12': pace(72, 12, 80, 12, { night: 'hide' }),
    'moth@94,23': pace(93, 23, 98, 23, { night: { x: 95, y: 23, facing: 'right' } }),
    'gran@7,19': { look: 3, path: [{ x: 5, y: 19 }, { x: 9, y: 19 }], pause: 6 },
    'pell@24,18': { look: 3 },
    'okoro@33,28': { look: 3 },
    'rafi@41,18': { look: 3 },
    'theo@56,18': { look: 3 },
    'dot@152,26': { look: 3 },
  },
  harbour: {
    'sal@21,24': pace(17, 24, 25, 24, { night: 'hide' }),
    'gus@45,23': pace(45, 23, 51, 23),
    'sal@73,26': pace(69, 26, 73, 26, { night: 'hide' }),
    'bolt@100,24': {
      loop: true,
      path: [{ x: 101, y: 24 }, { x: 105, y: 24 }, { x: 105, y: 26 }, { x: 101, y: 26 }],
      night: 'hide',
    },
    'lumen@109,19': pace(108, 19, 112, 19, { night: 'hide' }),
    'gran@11,24': { sit: 'right', night: { x: 10, y: 22, facing: 'down' } },
    'rosa@19,20': { look: 3 },
    'rosa@89,19': { look: 3 },
  },
  mossbell: {
    'wren@47,26': pace(46, 26, 48, 26),
    'wren@12,26': pace(9, 26, 14, 26),
    'moth@78,17': { look: 3 },
    'hazel@97,17': { look: 3 },
  },
  deep: {
    'pearl@27,22': pace(23, 22, 30, 22),
    'wren@59,22': pace(57, 22, 62, 22),
    'tess@56,24': pace(52, 24, 56, 24),
    'glimmer@82,24': pace(79, 24, 86, 24),
    'echo@96,25': pace(92, 25, 99, 25),
    'marlo@124,26': pace(121, 26, 127, 26),
    'marlo@36,17': { look: 3 },
  },
};
