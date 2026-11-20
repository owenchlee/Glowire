import { type ReactNode, useEffect, useState } from 'react';

import type * as Lore from './lore';
import type * as Story from './story';

/**
 * Story and lore text (about 80 KB) load as one on-demand chunk instead of riding in the shared
 * bundle every screen downloads. `lore` is filled once loaded; render lore users under <WithLore>.
 */
export const lore = {} as typeof Lore & typeof Story;
let loading: Promise<void> | undefined;
let ready = false;
const load = () =>
  (loading ??= import('./loreBundle').then((a) => {
    Object.assign(lore, a);
    ready = true;
  }));

export function WithLore({ children }: { children: ReactNode }) {
  const [ok, setOk] = useState(ready);
  useEffect(() => {
    if (!ok) void load().then(() => setOk(true));
  }, [ok]);
  return ok ? <>{children}</> : null;
}
