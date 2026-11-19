import { useEffect } from 'react';

/** Where a game leaves Pip a way to read its board: returns one concrete tip, or null. */
export type HintRef = { current: (() => string | null) | null };

export interface BrainProps {
  seed: number;
  onSay: (s: string) => void;
  onEnd: (score: number) => void;
  hint?: HintRef;
}

/** Keep Pip's view of the board current (and gone once the game closes). */
export function useHint(hintRef: HintRef | undefined, read: () => string | null) {
  useEffect(() => {
    if (!hintRef) return;
    hintRef.current = read;
    return () => {
      hintRef.current = null;
    };
  });
}
