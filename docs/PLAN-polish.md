# Polish plan: make the worlds interesting (overnight run, 2026-11-03)

## The problem (what the maps look like now)

Each world is a 40-tile-high strip with **one road**, buildings lined up along it and a wall of
trees above and below. Nothing is higher or lower than anything else, there is one bridge in
the whole game, nothing to see off the road, and nothing hidden. It reads as a corridor.

## What other games do (research)

Sources: Anatomy of Games (ALttP), Game Developer analyses of ALttP and Breath of the Wild,
Bulbapedia (Pokemon roadblocks and ledges), plus general level-design knowledge from Zelda,
Pokemon, Stardew, Earthbound, Hyper Light Drifter, Cat Quest, Eastward.

1. **One secret per screen at most** (ALttP). Cut each map into ~20x12 "screens"; most get one
   small discovery.
2. **Landmarks you can see from far away** (BotW towers). Each region gets one tall, high-contrast
   silhouette.
3. **Show the goal before the route.** Visible-but-unreachable things (a bridge, a cave, a chest
   on an island) make the detour the goal.
4. **Soft, diegetic gates**: water, cliffs, a broken bridge. For us the gate is a circuit.
5. **Routes bend, fork and loop.** Main path wide, side paths narrow, one fork ends in a reward.
6. **Hint, then reward.** Telegraph every secret (odd tree, path stub, sparkle, NPC rumour) and
   always pay it off.
7. **Elevation and edges**: cliffs, stairs, shores, ponds, a plateau. No flat rectangles.
8. **Clutter with purpose**: props in "story corners", not evenly sprinkled; empty clearings are
   rewards if they hold one thing.
9. **Collectibles make micro-goals**, with a visible counter.
10. **Each world has an identity** you can name from a screenshot.

## What we have to build with

- **Cliffs, ladders and cave doors** are in the village pack (`TilesetRelief.png`,
  `TilesetReliefDetail.png`) but were never put in the atlas. Adding them gives plateaus.
- Ponds, sea, sand, dirt, dark dirt, stone, boardwalks and bridges already exist.
- The secrets system (`lore.ts`), sightings (Glimmer in the distance), residents, gates and the
  shader lighting already exist.

## Stages

### Stage 1: the toolbox (me)

- Put the relief sheets in the atlas; recolour the pale plateau top to grass/sand so cliffs sit
  in the world.
- `MapBuilder`: `plateau`, `ladder`, `cave`, `stones` (stepping stones over water), `pond`
  helpers, `ridge` (a ragged band of plateaus for map edges).
- A **chest** spot (opens once, pays sparks, remembered in the save) and a **lanterns found**
  counter in the HUD.
- Tests: every new piece is walkable or solid exactly where it should be; every chest and
  grotto is reachable; no secret is walled in.

### Stage 2: the maps (parallel, one world each)

Each world keeps its jobs, areas and gates, and gets its surroundings rebuilt:

| World | Identity | New set-pieces |
|---|---|---|
| Glowtown | a valley town with a brook | a hill with a lookout (plateau + ladder), a pond with stepping stones to an island chest, a hidden grotto behind trees, a loop path round the pond, second bridge |
| Driftwood Harbour | sea cliffs and docks | a cliff terrace with the lighthouse climb, tide pools, a sea cave, a jetty to a tiny island, rowboat props |
| Mossbell Hollow | a boggy hollow with ruins | boardwalks across a marsh, a stone circle, a mill pond, ruin nooks with lore, a path that only appears at 11:52 clue |
| Brightwater Deep | a sunken town | reef ridges, alcoves, vent chimneys with bubbles, a hidden dome |

Rules for every map: break the tree wall into groves, clearings, ridges and ponds; add at
least one fork that rejoins; 2-3 hidden things with a hint each; one tall landmark.

### Stage 3: animation and feel

- Water that shimmers, shore foam, drifting leaves, fireflies at night, lamp flicker, grass sway.
- Footstep dust and ripples in shallows; a splash when stepping on stones.
- Sparkle on every unopened chest/secret; chest-open pop with sparks counting up.
- Screen transitions and button press feel (UI), nicer area-name banners when entering a place.

### Stage 4: ship

- `tsc`, `lint`, `vitest`, map previews for all four worlds, play-test in the browser.
- Log as version **v0.9** (tag, screenshots, decisions) in `docs/history`.
- Push after every stage so nothing is lost overnight.

## Out of scope tonight (ideas for later)

Pushable rocks, one-way ledges, fishing, day/night, NPC routines, a cat that leads you to
secrets.
