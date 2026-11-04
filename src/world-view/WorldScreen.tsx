// Walking a world's route. Arrow keys / WASD (two at once to go diagonally), the stick on a
// touch screen, or tap where to go; walk up to someone and press E / Enter / Space (or tap
// them) to talk. Their job opens the puzzle.
//
// The route goes one area at a time: walking into a new area plays its scene, and the road
// ahead stays dark (and gated) until every job in the area you're in is done.

import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { Counter, GOLD, Panel, PixelButton, PixelText } from '../ui/pixel';
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
import { type Walker, facingCells, newWalker, smoothPath, stepWalker, walkerCell } from '../world/walker';
import { WORLDS } from '../world/worlds';
import { Joystick } from './Joystick';
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
function pendingScene(map: WorldMap, save: SaveData, here: number): Scene | null {
  const solved = solvedIn(save);
  const seen = (id?: string) => !id || save.seen.includes(id);
  for (const a of map.areas) if (areaDone(a, solved) && a.jobs.length && !seen(a.outro)) return SCENES[a.outro!] ?? null;
  const area = map.areas[here];
  if (area && here < openAreas(map, solved) && !seen(area.intro)) return SCENES[area.intro!] ?? null;
  return null;
}

interface Talk {
  lines: DialogLine[];
  choices?: Choice[];
  /** Marked seen when it closes (a story scene or a notebook page). */
  seenId?: string;
}

export function WorldScreen({ map, worldId }: { map: WorldMap; worldId: string }) {
  const { save, markSeen, commitSave } = useGame();
  const solved = useMemo(() => solvedIn(save), [save]);
  const lit = useMemo(() => litGroups(map, solved), [map, solved]);
  const residents = useMemo(() => presentResidents(map, solved, lit), [map, solved, lit]);
  const blocked = useMemo(() => blockedCells(map, residents, solved), [map, residents, solved]);
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
  const areaIndex = useCallback((x: number, y: number) => map.areaOf[y * map.width + x] ?? 255, [map]);
  // Secrets still to find twinkle, once their part of the route is open.
  const sparkles = useMemo(
    () =>
      map.spots.flatMap((sp) =>
        (sp.kind === 'secret' && !found(sp.secret)) || (sp.kind === 'chest' && !save.seen.includes(chestKey(sp.id)))
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
  const scene = pendingScene(map, save, here);
  const talk: Talk | null = chat ?? (scene ? { lines: scene.lines, seenId: scene.id } : null);
  const isTalking = talk !== null;
  const talking = useRef(false);
  useEffect(() => {
    talking.current = isTalking;
  }, [isTalking]);
  const [facingLabel, setFacingLabel] = useState<string | null>(null);
  const [travelling, setTravelling] = useState(false);

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
        { label: dailyDone ? 'Play it again' : 'On my way!', tone: dailyDone ? 'gold' : 'orange', onPress: () => go('/daily') },
        ...askChoice('pip', true),
        { label: 'Later', tone: 'cream', onPress: close },
      ],
    });
  }, [dailyDone, go, close, askChoice]);

  /** What talking to someone (or using a door) says and offers. */
  const interact = useCallback(
    (target: Target) => {
      if (target.kind === 'gate') {
        const a = map.areas[target.area]!;
        const left = a.jobs.filter((j) => !solved(j)).length;
        setChat({
          lines: [
            { who: 'pip', text: a.gate ?? 'It’s too dark to go on.' },
            { who: 'pip', text: `${left} job${left === 1 ? '' : 's'} left in ${a.name}. Look for the “!”` },
          ],
        });
        return;
      }
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
          setChat({ lines: [{ who: client, text: 'My lights are out too… but finish the jobs back down the road first.' }] });
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
          choices: ask.length ? [...ask, { label: 'Bye!', tone: 'cream', onPress: close }] : undefined,
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
            { who: 'pip', text: `${first ? 'A page of Marigold’s notebook!' : 'Marigold’s notebook.'} Page ${n.page}: “${n.title}”.` },
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
              ? [{ who: 'glimmer', text: to.id === 'deep' ? 'Down the well, all the way to the sea? Hold on tight to my bubble.' : `Back up the well to ${to.name}? Hold on tight!` }]
              : [{ who: 'pip', text: `The night bus to ${to.name}! Hop on?` }],
            choices: [
              { label: bubble ? 'Hold on!' : 'All aboard!', tone: 'orange', onPress: () => go(`/world/${to.id}`) },
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
        if (save.seen.includes(chestKey(s.id))) setChat({ lines: [{ who: 'pip', text: 'Empty now. It was a good one, though.' }] });
        else {
          commitSave({ ...save, sparks: save.sparks + s.sparks, seen: [...save.seen, chestKey(s.id)] });
          buzz.win();
          setChat({ lines: [{ who: 'pip', text: `A hidden chest! Inside: ⚡${s.sparks} sparks. Bzzt, what a find!` }] });
        }
      } else if (s.kind === 'secret') {
        const sec = SECRETS[s.secret];
        if (sec) setChat({ lines: sec.lines, seenId: secretKey(sec.id) });
      }
    },
    [map, save, commitSave, solved, startJob, close, talkToPip, go, askChoice],
  );

  const facingTarget = useCallback((): Target | null => {
    for (const c of facingCells(walker.current)) {
      const t = targetAt(residents, map, c.x, c.y, solved);
      if (t) return t;
    }
    return null;
  }, [residents, map, solved]);

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
      const a = areaAt(c.x, c.y);
      if (a !== 255 && a !== lastArea.current) {
        lastArea.current = a;
        setHere(a);
      }
      if (map.underwater && !talking.current) {
        const inLight = litLightsNow.current.some((l) => Math.hypot(l.x - (w.x + 0.5), l.y - (w.y + 0.5)) < l.radius * 0.7);
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
          setChat({ lines: [{ who: 'pip', text: DARK_LINES[darkCount.current++ % DARK_LINES.length]! }] });
        }
      }
    },
    [facingTarget, interact, free, areaAt, map.underwater],
  );

  // Keyboard (web): hold arrows / WASD to walk (two at once for diagonals); E / Enter /
  // Space to talk.
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const held: Facing[] = [];
    const sync = () => {
      const on = (f: Facing) => (held.includes(f) ? 1 : 0);
      walker.current.input = { x: on('right') - on('left'), y: on('down') - on('up') };
    };
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
      const f = (Object.keys(STEP) as Facing[]).find((k) => from.x + STEP[k].x === cell.x && from.y + STEP[k].y === cell.y);
      if (f) w.facing = f;
      w.path = [];
      w.faceAtEnd = null;
      autoInteract.current = false;
      interact(target);
    }
  };

  const bubbles = useMemo(() => {
    const out: { who: string; x: number; y: number; kind: 'job' | 'chat' | 'heart' }[] = [];
    for (const r of residents) {
      if (r.job !== undefined && !solved(r.job) && jobOpen(map, r.job, solved)) out.push({ who: r.who, x: r.x, y: r.y, kind: 'job' });
      else if (r.who === 'pip' && !dailyDone) out.push({ who: r.who, x: r.x, y: r.y, kind: 'chat' });
      else if (r.chat && r.job === undefined) out.push({ who: r.who, x: r.x, y: r.y, kind: 'chat' });
    }
    return out;
  }, [residents, solved, map, dailyDone]);

  const left = allJobs(area).filter((j) => !solved(j)).length;
  const status = allJobs(area).length === 0 ? 'Home' : left === 0 ? 'All lit up!' : `${left} job${left === 1 ? '' : 's'} left here`;

  return (
    <View style={styles.screen}>
      <WorldCanvas
        map={map}
        paused={!focused}
        pet={save.equipped.pet}
        hero={outfitSprite(save.equipped.outfit)}
        lit={lit}
        fog={fog}
        residents={residents}
        bubbles={bubbles}
        sparkles={sparkles}
        ghosts={ghosts}
        walker={walker}
        lantern={lantern}
        onTick={onTick}
        onView={onView}
      />
      <Pressable style={StyleSheet.absoluteFill} onPress={(e) => onTap(e.nativeEvent.locationX, e.nativeEvent.locationY)} />
      {!talk && !travelling && <Joystick onInput={steer} />}

      <View style={styles.hud} pointerEvents="box-none">
        <Pressable style={styles.title} onPress={() => setTravelling(true)}>
          <PixelText size={18} color={GOLD} shadow>
            {area.name} ▾
          </PixelText>
          <PixelText size={12} color="#c9c3e6" shadow>
            {status}
          </PixelText>
          {map.underwater && <LanternGauge value={lanternShown} />}
        </Pressable>
        <View style={styles.flex} pointerEvents="none" />
        <Counter icon="✦" value={`${litCount}/${worldJobs.length}`} color="#ffe58a" />
        <Counter icon="✎" value={`${notesFound}/${notes.length}`} color="#c9e7ff" />
        {chests.length > 0 && <Counter icon="◆" value={`${chestsFound}/${chests.length}`} color="#f2b36b" />}
        {worldSecrets.length > 0 && <Counter icon="◉" value={`${secretsFound}/${worldSecrets.length}`} color="#ffd27a" />}
        <PixelButton label="Journal" tone="cream" size={13} onPress={() => go('/journal')} />
        <Counter icon="⚡" value={save.sparks} />
        <Counter icon="★" value={totalStars(save)} />
        <PixelButton label="Worlds" tone="teal" size={13} onPress={() => go('/')} />
      </View>

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
            <PixelButton label="Close" tone="cream" size={13} onPress={() => setTravelling(false)} />
          </Panel>
        </View>
      )}

      {talk && <Dialog key={talk.seenId ?? talk.lines[0]!.text} lines={talk.lines} choices={talk.choices} onClose={close} />}
    </View>
  );
}

/** How full the lantern is: a little jar that drains, gold when full and red when nearly out. */
function LanternGauge({ value }: { value: number }) {
  const color = value > 0.5 ? '#ffd27a' : value > 0.25 ? '#ef914f' : '#e0394c';
  return (
    <View style={styles.gauge} pointerEvents="none">
      <PixelText size={11} color={color} shadow>
        Lantern
      </PixelText>
      <View style={styles.gaugeBar}>
        <View style={[styles.gaugeFill, { width: `${Math.round(value * 100)}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

const chestKey = (id: string) => `chest:${id}`;

function labelFor(t: Target): string {
  if (t.kind === 'gate') return 'Look';
  if (t.kind === 'resident') return t.resident.who === 'pip' ? 'Talk to Pip' : 'Talk';
  switch (t.spot.kind) {
    case 'job':
      return 'Knock';
    case 'shop':
      return 'Enter shop';
    case 'daily':
      return 'Talk';
    case 'exit':
      return t.spot.via === 'bubble' ? 'The well' : 'Bus stop';
    case 'sign':
    case 'note':
      return 'Read';
    case 'secret':
      return 'Look';
    case 'chest':
      return 'Open';
    case 'game':
      return 'Play';
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
  gauge: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 },
  gaugeBar: { width: 70, height: 10, borderWidth: 2, borderColor: '#141b1b', backgroundColor: '#2e2b30', borderRadius: 2 },
  gaugeFill: { height: '100%' },
  action: { position: 'absolute', right: 18, bottom: 16, alignItems: 'center', gap: 2 },
  hint: { marginTop: 2 },
  travel: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(8,9,20,0.55)' },
  travelPanel: { width: 340, maxHeight: '86%' },
  travelTitle: { marginBottom: 8, textAlign: 'center' },
  travelList: { gap: 6, paddingBottom: 8 },
});
