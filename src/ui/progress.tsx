// Which levels the player has solved, saved on the device.

import { type ReactNode, createContext, useCallback, useContext, useMemo, useState } from 'react';

import { loadSave, writeSave } from './storage';

interface Progress {
  completed: ReadonlySet<number>;
  markComplete: (id: number) => void;
}

interface SaveFile {
  version: 1;
  completed: number[];
}

function readCompleted(): Set<number> {
  const save = loadSave() as Partial<SaveFile> | null;
  const ids = Array.isArray(save?.completed) ? save.completed : [];
  return new Set(ids.filter((id): id is number => Number.isInteger(id)));
}

const ProgressContext = createContext<Progress | null>(null);

export function ProgressProvider({ children }: { children: ReactNode }) {
  const [completed, setCompleted] = useState<ReadonlySet<number>>(readCompleted);
  const markComplete = useCallback(
    (id: number) =>
      setCompleted((s) => {
        if (s.has(id)) return s;
        const next = new Set(s).add(id);
        writeSave({ version: 1, completed: [...next] } satisfies SaveFile);
        return next;
      }),
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
