import { buildDeep } from './deep';
import { buildHarbour } from './harbour';
import { buildMossbell } from './mossbell';
import type { WorldMap } from './types';

export const OTHER_BUILDERS: Record<string, () => WorldMap> = {
  harbour: buildHarbour,
  mossbell: buildMossbell,
  deep: buildDeep,
};
