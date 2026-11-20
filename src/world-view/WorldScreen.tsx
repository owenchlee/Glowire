// Walking a world's route. Arrow keys / WASD (two at once to go diagonally), the stick on a
// touch screen, or tap where to go; walk up to someone and press E / Enter / Space (or tap
// them) to talk. Their job opens the puzzle.
//
// The route goes one area at a time: walking into a new area plays its scene, and the road
// ahead stays dark (and gated) until every job in the area you're in is done.

import { router, useFocusEffect } from 'expo-router';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { type SaveData, dayKey, totalStars } from '../game/save';
import { outfitSprite } from '../game/shop';
import { GAMES } from '../game/games';
import { buzz } from '../ui/haptics';
import { PERSON_SECRETS, SECRETS, secretKey, secretsIn } from '../game/lore';
import { NOTES, SCENES, type Scene } from '../game/story';
import { LEVELS } from '../levels/levels';
import type { LevelDef } from '../levels/types';
import { type Choice, Dialog, type DialogLine } from '../ui/Dialog';
import { starsFor, useGame } from '../ui/game';
import { Fishing } from '../ui/Fishing';
import { ChestGame } from '../ui/ChestGame';
import { SoundToggle } from '../ui/SoundToggle';
import { type ChestGameKind, chestDifficulty, chestGameFor } from '../ui/chestGames';
import { playSfx, playStep, startMusic } from '../audio/audio';
import { surfaceAt } from '../audio/surface';
import { Counter, GOLD, Panel, PixelButton, PixelText, Portrait } from '../ui/pixel';
import { type RockState, newRocks, pushRock, rockIndex, withRocks } from '../world/rocks';
import {
  STEP,
  type Target,
  allJobs,
  areaDone,
  blockedCells,
  canWalk,
  findPath,
  fogMask,
  jobOpen,
  litGroups,
  openAreas,
  presentResidents,
  targetAt,
} from '../world/logic';
import type { Facing, Point, WorldMap } from '../world/types';
import {
  type Walker,
  facingCells,
  setLedges,
  newWalker,
  smoothPath,
  stepWalker,
  walkerCell,
} from '../world/walker';
import { type Placed, placeResidents, residentKey } from '../world/routines';
import { ROUTINES } from '../world/routines.data';
import { WORLDS } from '../world/worlds';
import { dayClockSeconds } from './daylight';
import { Joystick } from './Joystick';
import { MapScreen } from './MapScreen';
import { readExplored, revealAround, writeExplored } from './explored';
import { guideHelp, guideTip, inTutorial, nextGoal, tutorialNudge } from './guide';
import { chestKey, labelFor, metKey, sceneReady } from './targets';
import { AreaBanner, LanternGauge } from './WorldHud';
import { type Puff, type View as CameraView, WorldCanvas } from './WorldCanvas';

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

/** Under the sea: seconds a full lantern lasts in the dark, and to fill it in the light. */
const LANTERN_SECONDS = 26;
const LANTERN_REFILL = 1.5;

/** What Pip says when the lantern runs out and the dark sends you back to the light. */
const DARK_LINES = [
  'Bzzt! The lantern’s out and something BREATHED on me! Back to the light, back to the light!',
  'It’s so dark… and there were EYES. Lots of eyes. We’re back by the lamp. We are STAYING by the lamp.',
  'Something cold brushed past us in the dark. It went “sssshh”. I did not like it one bit.',
  'Lantern’s empty! Remember: stand by a lit lamp to fill it up again. Robots are NOT built for the dark.',
];
const solvedIn = (save: SaveData) => (id: number) => starsFor(save, id) > 0;
const noteKey = (id: string) => `note:${id}`;

const startingPlace = (worldId: string, map: WorldMap) => lastPlace.get(worldId) ?? map.spawn;

/**
 * The story scene to play now, if any: an area's ending once its last job is done, else
 * the scene for the area you've just walked into.
 */
interface HudProps {
  areaName: string;
  status: string;
  lantern: number | null;
  onTravel: () => void;
  lit: string;
  sparks: number;
  stars: number;
  notes: string | null;
  fish: string | null;
  chests: string | null;
  secrets: string | null;
  onMap: () => void;
  onJournal: () => void;
  onWorlds: () => void;
}

interface GuideProps {
  tip: string;
  raised: boolean;
  onHelp: () => void;
}

/** Pip's tip panel. Memoized so it skips the per-step commits. */
const Guide = memo(function Guide({ tip, raised, onHelp }: GuideProps) {
  return (
    <View style={[styles.guide, raised ? styles.guideRaised : null]} pointerEvents="box-none">
      <Panel style={styles.guidePanel}>
        <View style={styles.guideRow}>
          <Portrait who="pip" size={34} />
          <PixelText size={12} style={styles.flex}>
            {tip}
          </PixelText>
        </View>
        <PixelButton label="Need help?" tone="teal" size={11} onPress={onHelp} />
      </Panel>
    </View>
  );
});

/** The full-screen "walk here" tap area. Memoized so it skips the per-step commits. */
const TapLayer = memo(function TapLayer({ onTap }: { onTap: (x: number, y: number) => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Walk here"
      style={StyleSheet.absoluteFill}
      onPress={(e) => onTap(e.nativeEvent.locationX, e.nativeEvent.locationY)}
    />
  );
});

/** The top bar. Memoized: it only changes when a number or label in it does, not on every step. */
const Hud = memo(function Hud(h: HudProps) {
  return (
    <View style={styles.hud} pointerEvents="box-none">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${h.areaName}. Open the travel map`}
        style={styles.title}
        onPress={h.onTravel}
      >
        <PixelText size={18} color={GOLD} shadow>
          {h.areaName} ▾
        </PixelText>
        <PixelText size={12} color="#c9c3e6" shadow>
          {h.status}
        </PixelText>
        {h.lantern !== null && <LanternGauge value={h.lantern} />}
      </Pressable>
      <View style={styles.right} pointerEvents="box-none">
        <View style={styles.line} pointerEvents="box-none">
          <Counter icon="✦" value={h.lit} color="#ffe58a" />
          <Counter icon="⚡" value={h.sparks} />
          <Counter icon="★" value={h.stars} />
          <SoundToggle />
        </View>
        {/* Collections only appear once you've found the first of each, labelled in words. */}
        <View style={styles.line} pointerEvents="box-none">
          {h.notes && <Counter icon="✎" value={h.notes} color="#c9e7ff" />}
          {h.fish && <Counter icon="≈" value={h.fish} color="#8fd0e8" />}
          {h.chests && <Counter icon="◆" value={h.chests} color="#f2b36b" />}
          {h.secrets && <Counter icon="◉" value={h.secrets} color="#ffd27a" />}
        </View>
        <View style={styles.line} pointerEvents="box-none">
          <PixelButton label="Map (M)" tone="gold" size={12} onPress={h.onMap} />
          <PixelButton label="Journal" tone="cream" size={12} onPress={h.onJournal} />
          <PixelButton label="Worlds" tone="teal" size={12} onPress={h.onWorlds} />
        </View>
      </View>
    </View>
  );
});

function pendingScene(map: WorldMap, save: SaveData, here: number): Scene | null {
  const solved = solvedIn(save);
  const seen = (id?: string) => !id || save.seen.includes(id);
  for (const a of map.areas)
    if (areaDone(a, solved) && a.jobs.length && !seen(a.outro)) return SCENES[a.outro!] ?? null;
  const area = map.areas[here];
  if (area && here < openAreas(map, solved) && !seen(area.intro))
    return SCENES[area.intro!] ?? null;
  return null;
}

interface Talk {
  lines: DialogLine[];
  choices?: Choice[] | undefined;
  /** Marked seen when it closes (a story scene or a notebook page). */
  seenId?: string;
}

export function WorldScreen({ map, worldId }: { map: WorldMap; worldId: string }) {
  const { save, markSeen, commitSave } = useGame();
  const solved = useMemo(() => solvedIn(save), [save]);
  const lit = useMemo(() => litGroups(map, solved), [map, solved]);
  const presentBase = useMemo(() => presentResidents(map, solved, lit), [map, solved, lit]);
  // Residents on their daily routines: placed from the shared clock (pure, see world/routines),
  // refreshed a few times a second, only re-rendering when someone changes cell or facing.
  const routines = ROUTINES[worldId];
  const placeNow = useCallback(
    (hero?: Point): Placed[] => {
      // The whole game is one blackout night, so people stay out instead of going home to bed.
      return placeResidents(presentBase, routines, dayClockSeconds(), false, hero, Infinity);
    },
    [presentBase, routines],
  );
  const [residents, setResidents] = useState<Placed[]>(() => placeNow());
  const residentsSig = useRef('');
  const heroRef = useRef<{ current: Walker } | null>(null);
  useEffect(() => {
    const refresh = () => {
      const w = heroRef.current?.current;
      const next = placeNow(w ? walkerCell(w) : undefined);
      const sig = next.map((r) => `${r.key}:${r.x},${r.y}:${r.facing}`).join('|');
      if (sig !== residentsSig.current) {
        residentsSig.current = sig;
        setResidents(next);
      }
    };
    refresh();
    const id = setInterval(refresh, 200);
    return () => clearInterval(id);
  }, [placeNow]);
  const baseBlocked = useMemo(() => {
    const b = blockedCells(map, residents, solved);
    // Someone on a routine leaves their home cell (which the map marks solid) free.
    if (routines)
      for (const r of presentBase) if (routines[residentKey(r)]) b[r.y * map.width + r.x] = 0;
    for (const r of residents) b[r.y * map.width + r.x] = 1;
    return b;
  }, [map, residents, solved, presentBase, routines]);
  // Pushable rocks: they start where the map puts them every time you come in, and the sign
  // beside each puzzle puts them back.
  const [rockState, setRockState] = useState<RockState>(() => newRocks(map));
  const rocksNow = useRef(rockState);
  const baseBlockedNow = useRef(baseBlocked);
  const pushTime = useRef(0);
  const puffs = useRef<Puff[]>([]);
  useEffect(() => {
    rocksNow.current = rockState;
    baseBlockedNow.current = baseBlocked;
  }, [rockState, baseBlocked]);
  const blocked = useMemo(
    () => withRocks(map, baseBlocked, rockState),
    [map, baseBlocked, rockState],
  );
  const [fishing, setFishing] = useState(false);
  const fog = useMemo(() => fogMask(map, solved), [map, solved]);
  const open = openAreas(map, solved);

  const worldJobs = useMemo(() => map.areas.flatMap(allJobs), [map]);
  const litCount = worldJobs.filter(solved).length;
  const dailyDone = (save.daily.stars[dayKey(new Date())] ?? 0) > 0;
  const notes = useMemo(() => map.spots.flatMap((s) => (s.kind === 'note' ? [s.note] : [])), [map]);
  const notesFound = notes.filter((n) => save.seen.includes(noteKey(n))).length;
  const found = useCallback((id: string) => save.seen.includes(secretKey(id)), [save.seen]);
  const worldSecrets = useMemo(() => secretsIn(map.id).filter((x) => !x.about), [map.id]);
  const secretsFound = worldSecrets.filter((x) => found(x.id)).length;
  const chests = useMemo(() => map.spots.flatMap((s) => (s.kind === 'chest' ? [s.id] : [])), [map]);
  const chestsFound = chests.filter((id) => save.seen.includes(chestKey(id))).length;
  // Opened chests join the lit set for drawing only, so the canvas swaps them for open ones.
  const drawnLit = useMemo(() => new Set([...lit, ...save.seen.filter((k) => k.startsWith('chest:'))]), [lit, save.seen]);
  const fishCaught = Object.values(save.fish ?? {}).reduce((a, b) => a + b, 0);
  const areaIndex = useCallback(
    (x: number, y: number) => map.areaOf[y * map.width + x] ?? 255,
    [map],
  );
  // Secrets still to find twinkle, once their part of the route is open.
  const sparkles = useMemo(
    () =>
      map.spots.flatMap((sp) =>
        (sp.kind === 'secret' && !found(sp.secret)) ||
        (sp.kind === 'chest' && !save.seen.includes(chestKey(sp.id)))
          ? areaIndex(sp.x, sp.y) < open
            ? [{ x: sp.x, y: sp.y }]
            : []
          : [],
      ),
    [map, found, areaIndex, open, save.seen],
  );
  // The Lantern Lady, glimpsed in the distance: there until you get close.
  const ghosts = useMemo(
    () =>
      map.sightings.filter(
        (g) => !found(g.id) && (!g.after || lit.has(g.after)) && areaIndex(g.x, g.y) < open,
      ),
    [map, found, lit, areaIndex, open],
  );
  const ghostsNow = useRef(ghosts);
  useEffect(() => {
    ghostsNow.current = ghosts;
  }, [ghosts]);

  const [start] = useState(() => startingPlace(worldId, map));
  const walker = useRef<Walker>(newWalker(start.x, start.y, start.facing));
  useEffect(() => {
    heroRef.current = walker;
  }, []);

  // Under the sea, the hero's lantern runs down in the dark and fills up again in the light
  // of a lit lamp. Let it run out and the dark closes in: you're sent back to the last light.
  const lantern = useRef(1);
  const [lanternShown, setLanternShown] = useState(1);
  const lanternShownNow = useRef(1);
  const darkCount = useRef(0);
  const lastLight = useRef({ x: start.x, y: start.y });
  const litLights = useMemo(() => map.lights.filter((l) => lit.has(l.group)), [map, lit]);
  const litLightsNow = useRef(litLights);
  useEffect(() => {
    litLightsNow.current = litLights;
  }, [litLights]);
  const blockedNow = useRef(blocked);
  useEffect(() => {
    blockedNow.current = blocked;
  }, [blocked]);
  const free = useCallback((x: number, y: number) => canWalk(map, blockedNow.current, x, y), [map]);

  // Pip's guide: the next job, and the Glowire glowing along the road to it.
  const [heroCell, setHeroCell] = useState(() => walkerCell(start));
  const tutorial = inTutorial(map, solved);
  const goal = useMemo(() => nextGoal(map, solved, residents, heroCell, blocked), [map, solved, residents, heroCell, blocked]);
  const trail = useMemo(
    // Only the first world lays the glowing road; later worlds are for exploring.
    () => (goal && map.id === 'glowtown' ? (findPath(map, blocked, heroCell, goal) ?? []) : []),
    [map, blocked, heroCell, goal],
  );
  // A ref, so callbacks that read the goal don't change (and re-bind the keys) on every step.
  const goalNow = useRef(goal);
  useEffect(() => {
    goalNow.current = goal;
  }, [goal]);
  // One-way ledges: the walker asks this (through the function) before climbing into a cell.
  useEffect(() => {
    setLedges(free, map.ledges, map.width);
  }, [free, map]);
  const view = useRef<CameraView>({ x: 0, y: 0, zoom: 48, width: 1, height: 1 });
  const onView = useCallback((v: CameraView) => {
    view.current = v;
  }, []);

  // Which area the hero is standing in (changes only when they cross into another).
  const areaAt = useCallback((x: number, y: number) => map.areaOf[y * map.width + x] ?? 255, [map]);
  const [here, setHere] = useState(() => {
    const c = walkerCell(start);
    return map.areaOf[c.y * map.width + c.x] ?? 255;
  });
  const area = map.areas[here === 255 ? 0 : here]!;

  // A story scene waiting to be seen takes over until it's done.
  const [chat, setChat] = useState<Talk | null>(null);
  const pending = pendingScene(map, save, here);
  const scene = pending && sceneReady(pending.lines, residents, heroCell) ? pending : null;
  const talk: Talk | null = chat ?? (scene ? { lines: scene.lines, seenId: scene.id } : null);
  // Chests: some are locked with a little skill game (ui/ChestGame); rock-puzzle ones never are.
  const [chestGame, setChestGame] = useState<{ id: string; sparks: number; kind: ChestGameKind } | null>(null);
  const rockChests = useMemo(
    () => new Set((map.puzzles ?? []).flatMap((p) => ('chest' in p && typeof p.chest === 'string' ? [p.chest] : []))),
    [map],
  );
  const openChest = useCallback((s: { id: string; sparks: number }) => {
    commitSave({ ...save, sparks: save.sparks + s.sparks, seen: [...save.seen, chestKey(s.id)] });
    buzz.win();
    playSfx('chest-open');
    setChat({ lines: [{ who: 'pip', text: `A hidden chest! Inside: ⚡${s.sparks} sparks. Bzzt, what a find!` }] });
  }, [save, commitSave]);

  // The map (M): what you've walked near is remembered in the save, a few seconds at a time.
  const [mapAt, setMapAt] = useState<Point | null>(null);
  const mapOpen = mapAt !== null;
  // The screen remounts per world (key=map.id), so this is read once per world.
  const [explored] = useState(() => {
    const ex = readExplored(save.seen, map);
    // Areas you've already finished count as explored (saves from before the map existed).
    for (let y = 0; y < map.height; y++)
      for (let x = 0; x < map.width; x++) {
        const a = map.areas[map.areaOf[y * map.width + x]!];
        if (a && a.jobs.length > 0 && areaDone(a, solved)) revealAround(ex, map, x, y, 0);
      }
    return ex;
  });
  const exploredDirty = useRef(false);
  const saveNow = useRef(save);
  useEffect(() => {
    saveNow.current = save;
  }, [save]);
  const storeExplored = useCallback(() => {
    if (!exploredDirty.current) return;
    exploredDirty.current = false;
    commitSave({ ...saveNow.current, seen: writeExplored(saveNow.current.seen, map, explored) });
  }, [commitSave, map, explored]);
  useEffect(() => {
    const id = setInterval(storeExplored, 4000);
    return () => {
      clearInterval(id);
      storeExplored();
    };
  }, [storeExplored]);
  const openMap = useCallback(() => {
    const w = walker.current;
    if (revealAround(explored, map, w.x, w.y, 7)) exploredDirty.current = true;
    storeExplored();
    setMapAt(walkerCell(w));
  }, [explored, map, storeExplored]);

  const isTalking = talk !== null || fishing || chestGame !== null || mapOpen;
  const openMapNow = useRef(openMap);
  useEffect(() => {
    openMapNow.current = openMap;
  }, [openMap]);
  useEffect(() => startMusic(), []);
  // Everyone who speaks to you counts as met, so their face shows on the world page from now on.
  const newlyMet = [...new Set((talk?.lines ?? []).map((l) => metKey(l.who)))]
    .filter((k) => !save.seen.includes(k))
    .join('|');
  useEffect(() => {
    if (newlyMet) commitSave({ ...save, seen: [...save.seen, ...newlyMet.split('|')] });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newlyMet]);
  const talking = useRef(false);
  const resyncKeys = useRef(() => {});
  useEffect(() => {
    talking.current = isTalking;
    // Keys still held through a chat or scene pick the walk back up when it closes.
    if (!isTalking) resyncKeys.current();
  }, [isTalking]);
  const [facingLabel, setFacingLabel] = useState<string | null>(null);
  const [travelling, setTravelling] = useState(false);

  // Pause the town while a puzzle or the shop is open on top of it.
  const [focused, setFocused] = useState(true);
  // Read by the key handler: this screen stays mounted under a puzzle, where its keys must do nothing.
  const focusedNow = useRef(true);
  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      focusedNow.current = true;
      return () => {
        setFocused(false);
        focusedNow.current = false;
      };
    }, []),
  );

  // Dev only: let the browser console poke at the walk state.
  useEffect(() => {
    if (__DEV__ && Platform.OS === 'web')
      (globalThis as Record<string, unknown>).__world = { walker, view, talking };
  }, []);

  const steer = useCallback((x: number, y: number) => {
    walker.current.input = { x, y };
  }, []);

  const remember = useCallback(() => {
    const w = walker.current;
    lastPlace.set(worldId, { x: w.x, y: w.y, facing: w.facing });
  }, [worldId]);

  const seenId = talk?.seenId;
  const close = useCallback(() => {
    if (seenId) markSeen(seenId);
    setChat(null);
  }, [seenId, markSeen]);

  const go = useCallback(
    (path: string) => {
      remember();
      setChat(null);
      router.push(path as never);
    },
    [remember],
  );
  const startJob = useCallback((level: LevelDef) => go(`/level/${level.id}`), [go]);

  const travel = useCallback(
    (index: number) => {
      const e = map.areas[index]!.entry;
      walker.current = newWalker(e.x, e.y, e.facing);
      setHere(index);
      setTravelling(false);
    },
    [map],
  );

  /** "Ask about…": a townsperson's secret, once you've helped them (see lore.ts). */
  const askChoice = useCallback(
    (who: string, helped: boolean): Choice[] => {
      const ps = PERSON_SECRETS[who];
      if (!ps || !helped || (ps.afterScene && !save.seen.includes(ps.afterScene))) return [];
      const sec = SECRETS[ps.secret]!;
      return [
        {
          label: found(sec.id) ? 'Ask again…' : 'Ask about…',
          tone: 'teal',
          onPress: () => setChat({ lines: sec.lines, seenId: secretKey(sec.id) }),
        },
      ];
    },
    [save.seen, found],
  );

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
        {
          label: dailyDone ? 'Play it again' : 'On my way!',
          tone: dailyDone ? 'gold' : 'orange',
          onPress: () => go('/daily'),
        },
        { label: 'Brain teaser', tone: 'teal', onPress: () => go('/brain-daily') },
        ...askChoice('pip', true),
        { label: 'Later', tone: 'cream', onPress: close },
      ],
    });
  }, [dailyDone, go, close, askChoice]);

  /** What talking to someone (or using a door) says and offers. */
  const interact = useCallback(
    (target: Target) => {
      // Tutorial: until the first house is lit, Pip steers you back to it (talking and reading are fine).
      if (tutorial && target.kind !== 'gate') {
        const s = target.kind === 'spot' ? target.spot : null;
        const r = target.kind === 'resident' ? target.resident : null;
        const job = r?.job ?? (s?.kind === 'job' ? s.job : undefined);
        const later =
          job !== undefined
            ? job !== goalNow.current?.job
            : r
              ? r.who === 'pip'
              : !!s && !['sign', 'note', 'secret'].includes(s.kind);
        if (later) {
          setChat({ lines: tutorialNudge(goalNow.current) });
          return;
        }
      }
      if (target.kind === 'gate') {
        const a = map.areas[target.area]!;
        const left = a.jobs.filter((j) => !solved(j)).length;
        setChat({
          lines: [
            { who: 'pip', text: a.gate ?? 'It’s too dark to go on.' },
            {
              who: 'pip',
              text: `${left} job${left === 1 ? '' : 's'} left in ${a.name}. Look for the “!”`,
            },
          ],
        });
        return;
      }
      const job =
        target.kind === 'resident'
          ? target.resident.job
          : target.spot.kind === 'job'
            ? target.spot.job
            : undefined;
      if (job !== undefined) {
        const level = levelById(job);
        const client = level.job!.client;
        const stars = starsFor(save, job);
        if (stars > 0) {
          setChat({
            lines: [{ who: client, text: level.job!.thanks }],
            choices: [
              {
                label: stars < 3 ? `Try for ${3 - stars} more ★` : 'Play again',
                tone: 'gold',
                onPress: () => startJob(level),
              },
              ...askChoice(client, true),
              { label: 'Bye!', tone: 'cream', onPress: close },
            ],
          });
        } else if (jobOpen(map, job, solved)) {
          setChat({
            lines: [{ who: client, text: level.job!.ask }],
            choices: [
              { label: 'Let’s fix it!', tone: 'orange', onPress: () => startJob(level) },
              { label: 'Not yet', tone: 'cream', onPress: close },
            ],
          });
        } else {
          setChat({
            lines: [
              {
                who: client,
                text: 'My lights are out too… but finish the jobs back down the road first.',
              },
            ],
          });
        }
        return;
      }
      if (target.kind === 'resident') {
        const r = target.resident;
        if (r.who === 'pip') return talkToPip();
        const lines = r.chat ? SCENES[r.chat]?.lines : undefined;
        const ask = askChoice(r.who, true);
        setChat({
          lines: lines ?? [{ who: r.who, text: 'Thank you for the lights!' }],
          choices: ask.length
            ? [...ask, { label: 'Bye!', tone: 'cream', onPress: close }]
            : undefined,
        });
        return;
      }
      const s = target.spot;
      if (s.kind === 'shop') go('/shop');
      else if (s.kind === 'daily') talkToPip();
      else if (s.kind === 'note') {
        const n = NOTES[s.note];
        if (!n) return;
        const first = !save.seen.includes(noteKey(n.id));
        setChat({
          lines: [
            {
              who: 'pip',
              text: `${first ? 'A page of Marigold’s notebook!' : 'Marigold’s notebook.'} Page ${n.page}: “${n.title}”.`,
            },
            ...n.lines,
          ],
          seenId: noteKey(n.id),
        });
      } else if (s.kind === 'exit') {
        const to = WORLDS.find((w) => w.id === s.to);
        const exitArea = map.areas[map.areaOf[s.y * map.width + s.x]!];
        const ready = !exitArea || areaDone(exitArea, solved);
        const bubble = s.via === 'bubble';
        if (to?.build && ready) {
          setChat({
            lines: bubble
              ? [
                  {
                    who: 'glimmer',
                    text:
                      to.id === 'deep'
                        ? 'Down the well, all the way to the sea? Hold on tight to my bubble.'
                        : `Back up the well to ${to.name}? Hold on tight!`,
                  },
                ]
              : [{ who: 'pip', text: `The night bus to ${to.name}! Hop on?` }],
            choices: [
              {
                label: bubble ? 'Hold on!' : 'All aboard!',
                tone: 'orange',
                onPress: () => go(`/world/${to.id}`),
              },
              { label: 'Not yet', tone: 'cream', onPress: close },
            ],
          });
        } else {
          setChat({
            lines: [
              {
                who: 'pip',
                text: bubble
                  ? 'An old well. A cold breeze is coming up out of it… and a faint sound, like a bell. Not now.'
                  : ready
                    ? `The bus to ${to?.name ?? 'the next town'}… The road’s still being fixed. Coming soon!`
                    : 'No buses while the Market Clock is broken. Nobody knows what time it is!',
              },
            ],
          });
        }
      } else if (s.kind === 'sign') setChat({ lines: [{ who: 'pip', text: s.text }] });
      else if (s.kind === 'game') {
        const info = GAMES[s.game];
        setChat({
          lines: [{ who: info.host, text: info.how }],
          choices: [
            { label: `Play ${info.title}`, tone: 'orange', onPress: () => go(`/game/${s.game}`) },
            { label: 'Not now', tone: 'cream', onPress: close },
          ],
        });
      } else if (s.kind === 'chest') {
        if (save.seen.includes(chestKey(s.id)))
          setChat({ lines: [{ who: 'pip', text: 'Empty now. It was a good one, though.' }] });
        else {
          // Chests behind a rock puzzle were the puzzle; the rest may be locked with a little game.
          const kind = rockChests.has(s.id) ? null : chestGameFor(s.id, s.sparks);
          if (kind) setChestGame({ id: s.id, sparks: s.sparks, kind });
          else openChest(s);
        }
      } else if (s.kind === 'fish') setFishing(true);
      else if (s.kind === 'reset') {
        const c = walkerCell(walker.current);
        if (rockState.filled.has(c.y * map.width + c.x))
          setChat({
            lines: [{ who: 'pip', text: 'You’re standing on a stepping stone! Hop off first.' }],
          });
        else {
          const rocks = newRocks(map);
          rocksNow.current = rocks;
          setRockState(rocks);
          setChat({
            lines: [
              { who: 'pip', text: 'Clunk, rumble… every rock slid back to where it started.' },
            ],
          });
        }
      } else if (s.kind === 'secret') {
        const sec = SECRETS[s.secret];
        if (sec) setChat({ lines: sec.lines, seenId: secretKey(sec.id) });
      }
    },
    [map, save, solved, tutorial, startJob, close, talkToPip, go, askChoice, rockState, rockChests, openChest],
  );

  const facingTarget = useCallback((): Target | null => {
    for (const c of facingCells(walker.current)) {
      const t = targetAt(residents, map, c.x, c.y, solved);
      if (t) return t;
    }
    return null;
  }, [residents, map, solved]);

  const needHelp = useCallback(
    () => setChat({ lines: guideHelp(map, solved, goalNow.current, Platform.OS === 'web') }),
    [map, solved],
  );
  const openTravel = useCallback(() => setTravelling(true), []);
  const goJournal = useCallback(() => go('/journal'), [go]);
  const goStory = useCallback(() => go('/story'), [go]);
  const act = useCallback(() => {
    if (talking.current) return;
    const t = facingTarget();
    if (t) interact(t);
  }, [facingTarget, interact]);

  // Things that need to happen when the walker arrives somewhere.
  const autoInteract = useRef(false);
  const lastLabel = useRef<string | null>(null);
  const lastArea = useRef(here);
  const onTick = useCallback(
    (dt: number) => {
      const w = walker.current;
      if (talking.current) {
        w.input = { x: 0, y: 0 };
        w.path = [];
      }
      const { arrived } = stepWalker(w, dt, free);
      if (w.moving) {
        playStep(surfaceAt(map, w.x + 0.5, w.y + 0.6));
        if (revealAround(explored, map, w.x, w.y, 7)) exploredDirty.current = true;
      }
      // Walking into a rock pushes it, after a short beat of leaning on it.
      const ax = Math.abs(w.input.x) > 0.3 ? Math.sign(w.input.x) : 0;
      const ay = Math.abs(w.input.y) > 0.3 ? Math.sign(w.input.y) : 0;
      const step = STEP[w.facing];
      const leaning =
        !talking.current &&
        !w.moving &&
        ((step.x !== 0 && ax === step.x) || (step.y !== 0 && ay === step.y));
      const rock = leaning
        ? facingCells(w).find((c) => rockIndex(rocksNow.current, c.x, c.y) >= 0)
        : undefined;
      if (rock) {
        pushTime.current += dt;
        if (pushTime.current > 0.3) {
          pushTime.current = 0;
          const moved = pushRock(
            map,
            baseBlockedNow.current,
            rocksNow.current,
            rock.x,
            rock.y,
            w.facing,
          );
          if (moved) {
            rocksNow.current = moved.state;
            setRockState(moved.state);
            buzz.thud();
            playSfx('rock-push');
            puffs.current.push({ x: moved.to.x + 0.5, y: moved.to.y + 0.9 }, { x: rock.x + 0.5, y: rock.y + 0.9 });
          }
        }
      } else pushTime.current = 0;
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
      // Get close to a glimpsed figure and it's gone, leaving Pip rattled.
      if (!talking.current)
        for (const g of ghostsNow.current)
          if (Math.hypot(g.x - w.x, g.y - w.y) < 3.5) {
            const sec = SECRETS[g.id];
            if (sec) setChat({ lines: sec.lines, seenId: secretKey(sec.id) });
            break;
          }
      const c = walkerCell(w);
      setHeroCell((old) => (old.x === c.x && old.y === c.y ? old : c));
      const a = areaAt(c.x, c.y);
      if (a !== 255 && a !== lastArea.current) {
        lastArea.current = a;
        setHere(a);
      }
      if (map.underwater && !talking.current) {
        const inLight = litLightsNow.current.some(
          (l) => Math.hypot(l.x - (w.x + 0.5), l.y - (w.y + 0.5)) < l.radius * 0.7,
        );
        if (inLight) {
          lantern.current = Math.min(1, lantern.current + dt / LANTERN_REFILL);
          lastLight.current = { x: w.x, y: w.y };
        } else lantern.current = Math.max(0, lantern.current - dt / LANTERN_SECONDS);
        const shown = Math.round(lantern.current * 20) / 20;
        if (shown !== lanternShownNow.current) {
          lanternShownNow.current = shown;
          setLanternShown(shown);
        }
        if (lantern.current <= 0) {
          // Out of light: something in the dark nudges you back to the last lamp.
          lantern.current = 0.5;
          walker.current = newWalker(lastLight.current.x, lastLight.current.y, w.facing);
          setChat({
            lines: [{ who: 'pip', text: DARK_LINES[darkCount.current++ % DARK_LINES.length]! }],
          });
        }
      }
    },
    [facingTarget, interact, free, areaAt, map, explored],
  );

  // Keyboard (web): hold arrows / WASD to walk (two at once for diagonals); E / Enter /
  // Space to talk.
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const held: Facing[] = [];
    const grace: ReturnType<typeof setTimeout>[] = [];
    const sync = () => {
      const on = (f: Facing) => (held.includes(f) ? 1 : 0);
      walker.current.input = { x: on('right') - on('left'), y: on('down') - on('up') };
    };
    resyncKeys.current = sync;
    const down = (e: KeyboardEvent) => {
      if (talking.current || !focusedNow.current) return;
      const dir = KEYS[e.key];
      if (dir) {
        e.preventDefault();
        if (!held.includes(dir)) held.push(dir);
        sync();
      } else if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        openMapNow.current();
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
      // Two keys never lift on the same frame: a short grace stops a diagonal ending in a sideways jerk.
      if (held.length) grace.push(setTimeout(sync, 70));
      else sync();
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
      grace.forEach(clearTimeout);
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
    const target = targetAt(residents, map, cell.x, cell.y, solved);
    const from = walkerCell(w);
    const cells = findPath(map, blocked, from, cell);
    if (!cells) return;
    // Settle into the cell you're on, then cut corners wherever nothing is in the way.
    w.path = smoothPath(w, [from, ...cells], free);
    w.faceAtEnd = target ? cell : null;
    autoInteract.current = target !== null;
    const settled = Math.abs(w.x - from.x) + Math.abs(w.y - from.y) < 0.05;
    if (target && cells.length === 0 && settled) {
      const f = (Object.keys(STEP) as Facing[]).find(
        (k) => from.x + STEP[k].x === cell.x && from.y + STEP[k].y === cell.y,
      );
      if (f) w.facing = f;
      w.path = [];
      w.faceAtEnd = null;
      autoInteract.current = false;
      interact(target);
    }
  };

  const onTapRef = useRef(onTap);
  useEffect(() => {
    onTapRef.current = onTap;
  });
  const tapNow = useCallback((px: number, py: number) => onTapRef.current(px, py), []);

  const bubbles = useMemo(() => {
    const out: { who: string; x: number; y: number; kind: 'job' | 'chat' | 'heart' }[] = [];
    for (const r of residents) {
      if (r.job !== undefined && !solved(r.job) && jobOpen(map, r.job, solved))
        out.push({ who: r.who, x: r.x, y: r.y, kind: 'job' });
      else if (r.who === 'pip' && !dailyDone)
        out.push({ who: r.who, x: r.x, y: r.y, kind: 'chat' });
      else if (r.chat && r.job === undefined)
        out.push({ who: r.who, x: r.x, y: r.y, kind: 'chat' });
    }
    return out;
  }, [residents, solved, map, dailyDone]);

  const left = allJobs(area).filter((j) => !solved(j)).length;
  const status =
    allJobs(area).length === 0
      ? 'Home'
      : left === 0
        ? 'All lit up!'
        : `${left} job${left === 1 ? '' : 's'} left here`;

  return (
    <View style={styles.screen}>
      <WorldCanvas
        map={map}
        paused={!focused}
        pet={save.equipped.pet}
        hero={outfitSprite(save.equipped.outfit)}
        lit={drawnLit}
        fog={fog}
        residents={residents}
        bubbles={bubbles}
        sparkles={sparkles}
        trail={trail}
        rocks={rockState}
        puffs={puffs}
        ghosts={ghosts}
        walker={walker}
        lantern={lantern}
        onTick={onTick}
        onView={onView}
      />
      <TapLayer onTap={tapNow} />
      {!talk && !travelling && <Joystick onInput={steer} />}
      {!talk && !travelling && (
        <AreaBanner key={`${map.id}:${here}`} name={area.name} world={map.name} />
      )}

      <Hud
        areaName={area.name}
        status={status}
        lantern={map.underwater ? lanternShown : null}
        onTravel={openTravel}
        lit={`${litCount}/${worldJobs.length} lit`}
        sparks={save.sparks}
        stars={totalStars(save)}
        notes={notesFound > 0 ? `Notes ${notesFound}/${notes.length}` : null}
        fish={fishCaught > 0 ? `Fish ${fishCaught}` : null}
        chests={chestsFound > 0 ? `Chests ${chestsFound}/${chests.length}` : null}
        secrets={secretsFound > 0 ? `Secrets ${secretsFound}/${worldSecrets.length}` : null}
        onMap={openMap}
        onJournal={goJournal}
        onWorlds={goStory}
      />

      {facingLabel && !talk && !travelling && (
        <View style={styles.action}>
          <PixelButton label={facingLabel} tone="gold" size={16} onPress={act} />
          {Platform.OS === 'web' && (
            <PixelText size={11} color="#c9c3e6" shadow style={styles.hint}>
              press E
            </PixelText>
          )}
        </View>
      )}

      {!talk && !travelling && !mapOpen && !chestGame && !fishing && (
        <Guide tip={guideTip(map, solved, goal)} raised={!!facingLabel} onHelp={needHelp} />
      )}

      {travelling && !talk && (
        <View style={styles.travel}>
          <Panel style={styles.travelPanel}>
            <PixelText size={16} color="#5b3a29" style={styles.travelTitle}>
              {map.name}: where to?
            </PixelText>
            <ScrollView contentContainerStyle={styles.travelList}>
              {map.areas.map((a, i) => {
                const reached = i < open;
                const done = a.jobs.length > 0 && areaDone(a, solved);
                return (
                  <PixelButton
                    key={a.id}
                    label={reached ? `${done ? '✦ ' : ''}${a.name}` : '??? (still dark)'}
                    tone={i === here ? 'gold' : reached ? 'orange' : 'cream'}
                    size={13}
                    disabled={!reached}
                    onPress={() => travel(i)}
                  />
                );
              })}
            </ScrollView>
            <PixelButton
              label="Close"
              tone="cream"
              size={13}
              onPress={() => setTravelling(false)}
            />
          </Panel>
        </View>
      )}

      {fishing && !talk && (
        <Fishing
          onClose={() => setFishing(false)}
          onCatch={(f) =>
            commitSave({
              ...save,
              sparks: save.sparks + f.sparks,
              fish: { ...save.fish, [f.id]: (save.fish[f.id] ?? 0) + 1 },
            })
          }
        />
      )}
      {talk && (
        <Dialog
          key={talk.seenId ?? talk.lines[0]!.text}
          lines={talk.lines}
          choices={talk.choices}
          onClose={close}
        />
      )}
      {chestGame && !talk && (
        <ChestGame
          key={chestGame.id}
          kind={chestGame.kind}
          difficulty={chestDifficulty(chestGame.sparks)}
          onWin={() => {
            const spot = chestGame;
            setChestGame(null);
            openChest(spot);
          }}
          onClose={() => setChestGame(null)}
        />
      )}
      {mapAt && (
        <MapScreen map={map} explored={explored} solved={solved} hero={mapAt} onClose={() => setMapAt(null)} />
      )}
    </View>
  );
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
    alignItems: 'flex-start',
    gap: 8,
  },
  title: { paddingHorizontal: 4, flexShrink: 1, minHeight: 44, justifyContent: 'center' },
  right: { alignItems: 'flex-end', gap: 4, flexShrink: 0 },
  line: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  action: { position: 'absolute', right: 18, bottom: 16, alignItems: 'center', gap: 2 },
  hint: { marginTop: 2 },
  guide: { position: 'absolute', right: 14, bottom: 14, width: 300, maxWidth: '46%' },
  // Sits above the action button ("Knock", "Talk") when that's showing.
  guideRaised: { bottom: 84 },
  guidePanel: { gap: 6, alignItems: 'flex-end' },
  guideRow: { flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'stretch' },
  travel: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(8,9,20,0.55)',
  },
  travelPanel: { width: 340, maxHeight: '86%' },
  travelTitle: { marginBottom: 8, textAlign: 'center' },
  travelList: { gap: 6, paddingBottom: 8 },
});
