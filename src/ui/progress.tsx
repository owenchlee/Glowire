// Which levels the player has solved. In memory only for now (saving needs a storage
// dependency, which is a separate decision).

import { type ReactNode, createContext, useCallback, useContext, useMemo, useState } from 'react';

interface Progress {
  completed: ReadonlySet<number>;
  markComplete: (id: number) => void;
}

const ProgressContext = createContext<Progress | null>(null);

export function ProgressProvider({ children }: { children: ReactNode }) {
  const [completed, setCompleted] = useState<ReadonlySet<number>>(() => new Set());
  const markComplete = useCallback(
    (id: number) => setCompleted((s) => (s.has(id) ? s : new Set(s).add(id))),
    [],
  );
  const value = useMemo(() => ({ completed, markComplete }), [completed, markComplete]);
  return <ProgressContext.Provider value={value}>{children}</ProgressContext.Provider>;
}

export function useProgress(): Progress {
  const ctx = useContext(ProgressContext);
  if (!ctx) throw new Error('useProgress must be used inside ProgressProvider');
  return ctx;
}
