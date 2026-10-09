# Glowire: game design

## What Glowire is

**One long puzzle campaign about real electronics, told in chapters.** Every chapter adds one
new idea (a part, a rule of physics, or a new kind of puzzle) and plays with it for 6–10
levels before the next idea arrives. The board, the drawing controls and the circuit solver
stay the same the whole way through.

Why a campaign, not a collection of minigames:

- **The engine is the game.** Glowire runs a real DC circuit solver (Kirchhoff's laws, LEDs
  with true diode curves). Every new part multiplies what that solver can do. Red, green and
  blue LEDs are just three forward voltages, yet they produce puzzles about current hogging,
  colour priority and "blue doesn't need a resistor". Separate minigames would each need their
  own rules and UI and would never get that compounding depth.
- **Variety comes from level formats, not separate games.** The same board can host different
  kinds of puzzle:
  - **Build:** draw wires and place parts to meet the goals. This is the main format.
  - **Repair:** a circuit someone else built wrong; find and fix the faults.
  - **Budget:** tight wire or part limits make it a routing puzzle.
  - **Twist:** everything is pre-placed, and you may only rotate pieces.
  - **Logic:** switch-state goals ("lit when S1 and S2 are ON").

  Each one feels like a different game but reuses everything.

- **It scales to hundreds of levels.** Each chapter's idea combines with every earlier one,
  so later chapters have more material, not less. A daily generated puzzle (see the roadmap)
  can carry the game past the handmade campaign.

## Design rules for levels

1. **One new idea per level, at most.** A level either teaches, tests, twists or combines.
2. **Every level has an aha.** If the first obvious attempt works, the level is a tutorial
   and should be short. Otherwise the obvious attempt should fail in a way the readouts
   explain (an LED tag shows its current; hints name burnouts, shorts and backwards parts).
3. **Physics, not trickery.** The solution is always something true about real circuits.
4. **Proven solvable, and proven not trivial.** Every level has a test with a worked
   solution, plus tests showing the tempting wrong answers fail (`levels.test.ts`).
5. **Brightness bands have gaps** (dim 3–15 %, medium 20–42 %, bright ≥ 45 % of 20 mA).
   Intended solutions should sit well inside a band, never on its edge.

## Chapters

| #   | Chapter     | New idea                                          | Status    |
| --- | ----------- | ------------------------------------------------- | --------- |
| 1   | First Light | Wire, resistor, brightness, parallel, switches    | 10 levels |
| 2   | Colours     | Green and blue LEDs: forward voltage, hogging     | 8 levels  |
| 3   | Power Up    | Batteries as parts: series voltage, LED strings   | 7 levels  |
| 4   | Twist       | Rotate-only puzzles (new format)                  | 6 levels  |
| 5   | Crossroads  | Changeover (two-way) switch: staircase light, XOR | planned   |
| 6   | One Way     | Plain diodes: steering current, diode logic       | planned   |
| 7   | Meters      | Hit an exact current or voltage                   | planned   |
| 8   | Flicker     | Capacitors (needs a time-stepping solver)         | planned   |
| 9   | Amplify     | Transistors as switches                           | planned   |
| 10+ | …           | Light sensors, buzzers, motors, logic gates       | planned   |

### Chapter 2: Colours (3 V only)

LEDs of different colours need different voltages to light: red ≈ 2.0 V, green ≈ 2.2 V,
blue ≈ 3.0 V. Three surprising, true consequences carry the chapter:

- **A blue LED doesn't need a resistor on 3 V.** The battery can barely push it, so it is safe
  (and a resistor makes it dim). This breaks the rule chapter 1 drilled in, on purpose.
- **Current hogging.** LEDs in parallel sharing one resistor: the lowest-voltage colour takes
  almost all the current. Red beside blue leaves blue completely dark.
- **Hogging is a feature.** A switch in the red branch makes a two-way light: red ON means
  green OFF, and red OFF means green ON. With three colours it becomes a priority display.

| Level | Title          | The aha                                                           |
| ----- | -------------- | ----------------------------------------------------------------- |
| 2-1   | Go Green       | Green is a bit dimmer than red with the same resistor; pick 220 Ω |
| 2-2   | Feeling Blue   | Bright blue = no resistor at all                                  |
| 2-3   | Each Their Own | A shared resistor lets red starve blue; red gets its own resistor |
| 2-4   | Rainbow        | Three branches; each colour gets the right resistor for its band  |
| 2-5   | Colour Blind   | Repair: someone hung all three colours on one resistor            |
| 2-6   | Stop & Go      | One switch flips between red and green, using hogging             |
| 2-7   | Dimmer Switch  | A switch across a resistor bypasses it: blue dim ↔ bright         |
| 2-8   | Pecking Order  | Two switches; red beats green beats blue (a priority display)     |

### Chapter 3: Power Up

Batteries become parts you place. Batteries in a row add up (+ to −). Facing opposite ways,
they cancel. With more voltage, LEDs can run in strings, and familiar resistors become
dangerous.

| Level | Title         | The aha                                                                |
| ----- | ------------- | ---------------------------------------------------------------------- |
| 3-1   | Stack 'Em     | Two LEDs in a row won't light on 3 V; stack a second battery           |
| 3-2   | Daisy Chain   | No resistors at all: three LEDs in a string limit themselves on 6 V    |
| 3-3   | Nine Volts    | One or two 100 Ω resistors burn the LED at 9 V; all three in series    |
| 3-4   | Tug of War    | Repair, three faults: a battery fights, an LED is backwards, 1 kΩ dim  |
| 3-5   | Shortcut      | A switch across one LED of a string: it goes dark, the others brighten |
| 3-6   | Party Lights  | Free build: four LEDs, two resistors; only strings on 6 V can do it    |
| 3-7   | Middle Ground | A wire between two stacked batteries taps 3 V for blue; reds get 6 V   |

### Chapter 4: Twist

A different way to play: the board is full and scrambled, there is no tray and no drawing,
and tapping turns a piece. Each level is written as its solved picture, and the game
shuffles the pieces from a fixed seed, so every twist level is solvable by construction.
Batteries and switches never turn; they are the anchors. Tests check that each scramble can
be turned back, that the start is not already solved, and that random turning almost never
solves it. Decoy pieces carry the electrical ideas: a bridge that shorts the battery, a loop
around the switch, a cup that bypasses the resistor.

| Level | Title        | The aha                                                        |
| ----- | ------------ | -------------------------------------------------------------- |
| 4-1   | Turn, Turn   | Tutorial: close the loop                                       |
| 4-2   | Both Ways    | Every LED must face along the loop                             |
| 4-3   | No Shortcuts | One bridge piece, turned the wrong way, shorts the battery     |
| 4-4   | Off Switch   | A tempting loop runs around the switch; leave it open          |
| 4-5   | Signal Box   | Stop & Go as a twist: the shared resistor lets red hog         |
| 4-6   | Two Roads    | Two switches in parallel, plus decoys that bypass the resistor |

## Roadmap beyond this pass

- **More twist levels** mixed into later chapters: colours, stacked batteries, bigger boards.
- **Stars:** a par for wire and parts per level; a second and third star reward elegance.
  Every level can be replayed with this alone.
- **Daily circuit:** generate a goal and a board from a seed, check it with a solver search,
  and give everyone the same puzzle each day.
- **Changeover switch, diodes, meters:** new two- and three-terminal tiles; the solver
  already handles any resistor/diode/source network.
- **Capacitors and transistors:** need a time-stepping solver and a 3-terminal model.
