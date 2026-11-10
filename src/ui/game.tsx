// The player's save (stars, sparks, shop, daily streak), shared by every screen and kept on
// the device. The rules live in game/save.ts; this only holds state and writes it to disk.

import {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  type JobPayout,
  type SaveData,
  buy as buyItem,
  equip as equipItem,
  migrate,
  recordDaily,
  recordGame,
  recordJob,
} from '../game/save';
import { itemOf } from '../game/shop';
import { LEVELS } from '../levels/levels';
import { wearSkin as setSkin } from '../puzzle-view/skin';
import { applySkin } from '../render/assets';
import { loadSave, writeSave } from './storage';

export const JOB_ORDER = LEVELS.map((l) => l.id);

interface Game {
  save: SaveData;
  /** Record a job's stars; returns what it paid. */
  finishJob: (id: number, stars: number, boss?: boolean) => JobPayout;
  finishDaily: (day: string, stars: number) => JobPayout;
  /** Record a mini-game score; returns what a new best paid. */
  finishGame: (game: string, score: number) => JobPayout;
  buy: (id: string) => boolean;
  equip: (id: string) => void;
  markSeen: (sceneId: string) => void;
  setUnlockAll: (on: boolean) => void;
}

const GameContext = createContext<Game | null>(null);

function wearSkin(wireId: string, boardId: string) {
  const w = itemOf('wire', wireId);
  const b = itemOf('board', boardId);
  if (w && b) {
    setSkin(w, b);
    applySkin(w, b);
  }
}

export function GameProvider({ children }: { children: ReactNode }) {
  // The latest save lives in a ref that commit() updates synchronously, so two changes made
  // before React re-renders build on each other instead of the second wiping the first.
  const latest = useRef<SaveData | null>(null);
  const [save, setSave] = useState<SaveData>(() => {
    const loaded = migrate(loadSave());
    // Wear the saved skin before anything renders (a board that opens first would miss it).
    wearSkin(loaded.equipped.wire, loaded.equipped.board);
    latest.current = loaded;
    return loaded;
  });

  // Every change is written straight away: losing a purchase would feel terrible.
  const commit = useCallback((next: SaveData) => {
    latest.current = next;
    writeSave(next);
    setSave(next);
    return next;
  }, []);

  // Results are computed from the latest save synchronously, so callers get the payout.
  const finishJob = useCallback(
    (id: number, stars: number, boss = false) => {
      const prev = latest.current as SaveData;
      const payout = recordJob(prev, id, stars, boss);
      if (payout.save !== prev) commit(payout.save);
      return payout;
    },
    [commit],
  );
  const finishDaily = useCallback(
    (day: string, stars: number) => {
      const prev = latest.current as SaveData;
      const payout = recordDaily(prev, day, stars);
      if (payout.save !== prev) commit(payout.save);
      return payout;
    },
    [commit],
  );
  const finishGame = useCallback(
    (game: string, score: number) => {
      const prev = latest.current as SaveData;
      const payout = recordGame(prev, game, score);
      if (payout.save !== prev) commit(payout.save);
      return payout;
    },
    [commit],
  );
  const buy = useCallback(
    (id: string) => {
      const result = buyItem(latest.current as SaveData, id);
      if (result.ok) commit(result.save);
      return result.ok;
    },
    [commit],
  );
  const equip = useCallback(
    (id: string) => commit(equipItem(latest.current as SaveData, id)),
    [commit],
  );
  const markSeen = useCallback(
    (sceneId: string) => {
      const prev = latest.current as SaveData;
      if (!prev.seen.includes(sceneId)) commit({ ...prev, seen: [...prev.seen, sceneId] });
    },
    [commit],
  );
  const setUnlockAll = useCallback(
    (on: boolean) => commit({ ...(latest.current as SaveData), unlockAll: on }),
    [commit],
  );

  // Cosmetics live in the shared 3D materials, so the board picks them up everywhere.
  const { wire, board } = save.equipped;
  useEffect(() => wearSkin(wire, board), [wire, board]);

  const value = useMemo(
    () => ({ save, finishJob, finishDaily, finishGame, buy, equip, markSeen, setUnlockAll }),
    [save, finishJob, finishDaily, finishGame, buy, equip, markSeen, setUnlockAll],
  );
  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame(): Game {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used inside GameProvider');
  return ctx;
}

export const starsFor = (save: SaveData, id: number) => save.stars[String(id)] ?? 0;
