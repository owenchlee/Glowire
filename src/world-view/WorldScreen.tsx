// Walking around a world. Arrow keys / WASD (or tap where to go) to walk; walk up to
// someone and press E / Enter / Space (or tap them) to talk. Their job opens the puzzle.

import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';

import { type SaveData, dayKey, isUnlocked, totalStars } from '../game/save';
import { DISTRICTS, PROLOGUE, type Scene } from '../game/story';
import { CHAPTERS, LEVELS } from '../levels/levels';
import type { LevelDef } from '../levels/types';
import { type Choice, Dialog, type DialogLine } from '../ui/Dialog';
import { JOB_ORDER, starsFor, useGame } from '../ui/game';
import { Counter, GOLD, PixelButton, PixelText } from '../ui/pixel';
import { STEP, blockedCells, canWalk, findPath, litGroups, presentResidents, targetAt, type Target } from '../world/logic';
import type { Facing, Point, WorldMap } from '../world/types';
import { type Walker, newWalker, stepWalker } from '../world/walker';
import { WORLDS } from '../world/worlds';
import { type View as CameraView, WorldCanvas } from './WorldCanvas';

/** Where the hero was standing in each world, so coming back from a puzzle feels seamless. */
const lastPlace = new Map<string, { x: number; y: number; facing: Facing }>();

const KEYS: Record<string, Facing> = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
  w: 'up',
  s: 'down',
  a: 'left',
  d: 'right',
  W: 'up',
  S: 'down',
  A: 'left',
  D: 'right',
};

const levelById = (id: number) => LEVELS.find((l) => l.id === id)!;
const solvedIn = (save: SaveData) => (id: number) => starsFor(save, id) > 0;

function startingWalker(worldId: string, map: WorldMap): Walker {
  const at = lastPlace.get(worldId) ?? map.spawn;
  return newWalker(at.x, at.y, at.facing);
}

/** The next story scene the player hasn't seen, for this world's chapters. */
function pendingScene(save: SaveData, chapters: number[]): Scene | null {
  if (!save.seen.includes(PROLOGUE.id)) return PROLOGUE;
  for (const d of DISTRICTS.filter((x) => chapters.includes(x.chapter))) {
    const chapter = CHAPTERS.find((c) => c.id === d.chapter)!;
    const reached = isUnlocked({ ...save, unlockAll: false }, JOB_ORDER, chapter.levels[0]!.id);
    if (reached && !save.seen.includes(d.intro.id)) return d.intro;
    if (chapter.levels.every((l) => starsFor(save, l.id) > 0) && !save.seen.includes(d.outro.id)) return d.outro;
  }
  return null;
}

interface Talk {
  lines: DialogLine[];
  choices?: Choice[];
  /** Called when it closes, if it was a story scene. */
  sceneId?: string;
}

export function WorldScreen({ map, worldId }: { map: WorldMap; worldId: string }) {
  const { save, markSeen } = useGame();
  const info = WORLDS.find((w) => w.id === worldId)!;
  const solved = useMemo(() => solvedIn(save), [save]);
  const residents = useMemo(() => presentResidents(map, JOB_ORDER, solved), [map, solved]);
  const lit = useMemo(() => litGroups(map, solved), [map, solved]);
  const blocked = useMemo(() => blockedCells(map, residents), [map, residents]);

  const worldJobs = useMemo(
    () => CHAPTERS.filter((c) => info.chapters.includes(c.id)).flatMap((c) => c.levels),
    [info],
  );
  const nextJob = worldJobs.find((l) => isUnlocked(save, JOB_ORDER, l.id) && !solved(l.id));
  const litCount = worldJobs.filter((l) => solved(l.id)).length;
  const dailyDone = (save.daily.stars[dayKey(new Date())] ?? 0) > 0;

  const walker = useRef<Walker>(startingWalker(worldId, map));
  const blockedNow = useRef(blocked);
  useEffect(() => {
    blockedNow.current = blocked;
  }, [blocked]);
  const free = useCallback((x: number, y: number) => canWalk(map, blockedNow.current, x, y), [map]);
  const view = useRef<CameraView>({ x: 0, y: 0, zoom: 48, width: 1, height: 1 });
  const onView = useCallback((v: CameraView) => {
    view.current = v;
  }, []);

  // A story scene waiting to be seen takes over until it's done.
  const [chat, setChat] = useState<Talk | null>(null);
  const scene = pendingScene(save, info.chapters);
  const talk: Talk | null = chat ?? (scene ? { lines: scene.lines, sceneId: scene.id } : null);
  const isTalking = talk !== null;
  const talking = useRef(false);
  useEffect(() => {
    talking.current = isTalking;
  }, [isTalking]);
  const [facingLabel, setFacingLabel] = useState<string | null>(null);

  // Pause the town while a puzzle or the shop is open on top of it.
  const [focused, setFocused] = useState(true);
  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      return () => setFocused(false);
    }, []),
  );

  // Dev only: let the browser console poke at the walk state.
  useEffect(() => {
    if (__DEV__ && Platform.OS === 'web') (globalThis as Record<string, unknown>).__world = { walker, view, talking };
  }, []);

  const remember = useCallback(() => {
    const w = walker.current;
    lastPlace.set(worldId, { x: w.x, y: w.y, facing: w.facing });
  }, [worldId]);

  const sceneId = talk?.sceneId;
  const close = useCallback(() => {
    if (sceneId) markSeen(sceneId);
    setChat(null);
  }, [sceneId, markSeen]);

  const go = useCallback(
    (path: string) => {
      remember();
      setChat(null);
      router.push(path as never);
    },
    [remember],
  );
  const startJob = useCallback((level: LevelDef) => go(`/level/${level.id}`), [go]);

  const talkToPip = useCallback(() => {
    setChat({
      lines: [
        {
          who: 'pip',
          text: dailyDone
            ? 'Today’s emergency is fixed! A new blackout hits tomorrow. Bzzt.'
            : 'Bzzt! Emergency call! A blackout somewhere in town. It’s different every day!',
        },
      ],
      choices: [
        { label: dailyDone ? 'Play it again' : 'On my way!', tone: dailyDone ? 'gold' : 'orange', onPress: () => go('/daily') },
        { label: 'Later', tone: 'cream', onPress: close },
      ],
    });
  }, [dailyDone, go, close]);

  /** What talking to someone (or using a door) says and offers. */
  const interact = useCallback(
    (target: Target) => {
      const job = target.kind === 'resident' ? target.resident.job : target.spot.kind === 'job' ? target.spot.job : undefined;
      if (job !== undefined) {
        const level = levelById(job);
        const client = level.job!.client;
        const stars = starsFor(save, job);
        if (stars > 0) {
          setChat({
            lines: [{ who: client, text: level.job!.thanks }],
            choices: [
              { label: stars < 3 ? `Try for ${3 - stars} more ★` : 'Play again', tone: 'gold', onPress: () => startJob(level) },
              { label: 'Bye!', tone: 'cream', onPress: close },
            ],
          });
        } else if (isUnlocked(save, JOB_ORDER, job)) {
          setChat({
            lines: [{ who: client, text: level.job!.ask }],
            choices: [
              { label: 'Let’s fix it!', tone: 'orange', onPress: () => startJob(level) },
              { label: 'Not yet', tone: 'cream', onPress: close },
            ],
          });
        } else {
          const waiting = nextJob ? `${nextJob.job!.place}` : 'the other jobs';
          setChat({
            lines: [
              {
                who: client,
                text: `My lights are out too… but I can wait. Someone needs you more right now: ${waiting}.`,
              },
            ],
          });
        }
        return;
      }
      if (target.kind === 'resident' && target.resident.who === 'pip') return talkToPip();
      if (target.kind === 'spot') {
        const s = target.spot;
        if (s.kind === 'shop') go('/shop');
        else if (s.kind === 'daily') talkToPip(); else if (s.kind === 'exit') {
          const to = WORLDS.find((w) => w.id === s.to);
          setChat({
            lines: [
              {
                who: 'pip',
                text: to?.build
                  ? `The bus to ${to.name}! Hop on?`
                  : `The bus to ${to?.name ?? 'the next town'}… The road’s still being fixed. Coming soon!`,
              },
            ],
          });
        } else if (s.kind === 'sign') {
          setChat({ lines: [{ who: 'pip', text: s.text }] });
        }
      }
    },
    [save, nextJob, startJob, close, talkToPip, go],
  );

  const facingTarget = useCallback((): Target | null => {
    const w = walker.current;
    if (w.to) return null;
    const d = STEP[w.facing];
    return targetAt(residents, map, w.x + d.x, w.y + d.y);
  }, [residents, map]);

  const act = useCallback(() => {
    if (talking.current) return;
    const t = facingTarget();
    if (t) interact(t);
  }, [facingTarget, interact]);

  // Things that need to happen when the walker arrives somewhere.
  const autoInteract = useRef(false);
  const lastLabel = useRef<string | null>(null);
  const onTick = useCallback(
    (dt: number) => {
      const w = walker.current;
      if (talking.current) {
        w.held = null;
        w.path = [];
      }
      const { arrived } = stepWalker(w, dt, free);
      if (arrived && autoInteract.current) {
        autoInteract.current = false;
        const t = facingTarget();
        if (t) interact(t);
      }
      const t = facingTarget();
      const label = t ? labelFor(t) : null;
      if (label !== lastLabel.current) {
        lastLabel.current = label;
        setFacingLabel(label);
      }
    },
    [facingTarget, interact, free],
  );

  // Keyboard (web): hold arrows / WASD to walk; E / Enter / Space to talk.
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const held: Facing[] = [];
    const sync = () => (walker.current.held = held[held.length - 1] ?? null);
    const down = (e: KeyboardEvent) => {
      if (talking.current) return;
      const dir = KEYS[e.key];
      if (dir) {
        e.preventDefault();
        if (!held.includes(dir)) held.push(dir);
        sync();
      } else if (['e', 'E', 'Enter', ' '].includes(e.key)) {
        e.preventDefault();
        act();
      }
    };
    const up = (e: KeyboardEvent) => {
      const dir = KEYS[e.key];
      if (!dir) return;
      const i = held.indexOf(dir);
      if (i >= 0) held.splice(i, 1);
      sync();
    };
    const blur = () => {
      held.length = 0;
      sync();
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', blur);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', blur);
    };
  }, [act]);

  // Tap / click: walk there, and talk to whoever was tapped.
  const onTap = (px: number, py: number) => {
    if (talking.current) return;
    const v = view.current;
    const cell: Point = {
      x: Math.floor(v.x + (px - v.width / 2) / v.zoom),
      y: Math.floor(v.y + (py - v.height / 2) / v.zoom),
    };
    const w = walker.current;
    const target = targetAt(residents, map, cell.x, cell.y);
    const from = w.to ?? { x: w.x, y: w.y };
    const path = findPath(map, blocked, from, cell);
    if (!path) return;
    w.path = path;
    w.held = null;
    w.faceAtEnd = target ? cell : null;
    autoInteract.current = target !== null;
    if (target && path.length === 0 && !w.to) {
      w.facing = (Object.keys(STEP) as Facing[]).find(
        (f) => w.x + STEP[f].x === cell.x && w.y + STEP[f].y === cell.y,
      )!;
      autoInteract.current = false;
      interact(target);
    }
  };

  const bubbles = useMemo(() => {
    const out: { who: string; x: number; y: number; kind: 'job' | 'chat' | 'heart' }[] = [];
    for (const r of residents) {
      if (r.job !== undefined && r.job === nextJob?.id) out.push({ who: r.who, x: r.x, y: r.y, kind: 'job' });
      else if (r.who === 'pip' && !dailyDone) out.push({ who: r.who, x: r.x, y: r.y, kind: 'chat' });
    }
    return out;
  }, [residents, nextJob, dailyDone]);

  return (
    <View style={styles.screen}>
      <WorldCanvas
        map={map}
        paused={!focused}
        pet={save.equipped.pet}
        lit={lit}
        residents={residents}
        bubbles={bubbles}
        walker={walker}
        onTick={onTick}
        onView={onView}
      />
      <Pressable style={StyleSheet.absoluteFill} onPress={(e) => onTap(e.nativeEvent.locationX, e.nativeEvent.locationY)} />

      <View style={styles.hud} pointerEvents="box-none">
        <View style={styles.title}>
          <PixelText size={18} color={GOLD} shadow>
            {map.name}
          </PixelText>
          <PixelText size={12} color="#c9c3e6" shadow>
            {litCount} / {worldJobs.length} lights back on
          </PixelText>
        </View>
        <View style={styles.flex} pointerEvents="none" />
        <Counter icon="⚡" value={save.sparks} />
        <Counter icon="★" value={totalStars(save)} />
        <PixelButton label="Map" tone="teal" size={13} onPress={() => go('/')} />
      </View>

      {nextJob && !talk && (
        <View style={styles.goal} pointerEvents="none">
          <PixelText size={12} color="#c9c3e6" shadow>
            NEXT JOB
          </PixelText>
          <PixelText size={14} color="#fff3c4" shadow>
            {nextJob.job!.place}
          </PixelText>
        </View>
      )}

      {facingLabel && !talk && (
        <View style={styles.action}>
          <PixelButton label={facingLabel} tone="gold" size={16} onPress={act} />
          {Platform.OS === 'web' && (
            <PixelText size={11} color="#c9c3e6" shadow style={styles.hint}>
              press E
            </PixelText>
          )}
        </View>
      )}

      {talk && <Dialog key={talk.sceneId ?? talk.lines[0]!.text} lines={talk.lines} choices={talk.choices} onClose={close} />}
    </View>
  );
}

function labelFor(t: Target): string {
  if (t.kind === 'resident') return t.resident.who === 'pip' ? 'Talk to Pip' : 'Talk';
  switch (t.spot.kind) {
    case 'job':
      return 'Knock';
    case 'shop':
      return 'Enter shop';
    case 'daily':
      return 'Talk';
    case 'exit':
      return 'Bus stop';
    case 'sign':
      return 'Read';
  }
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0d0f1e', overflow: 'hidden' },
  flex: { flex: 1 },
  hud: {
    position: 'absolute',
    top: 10,
    left: 14,
    right: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: { paddingHorizontal: 4 },
  goal: {
    position: 'absolute',
    left: 18,
    bottom: 14,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: 'rgba(13,15,30,0.78)',
    borderWidth: 2,
    borderColor: '#141b1b',
    borderRadius: 6,
  },
  action: { position: 'absolute', right: 18, bottom: 16, alignItems: 'center', gap: 2 },
  hint: { marginTop: 2 },
});
