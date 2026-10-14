---
name: run-glowire
description: Run, start, launch, open in Chrome, screenshot, play or drive the Glowire game (Expo web build) — walk the hero, click through dialogs, draw circuit wires, solve a level, check a change in the real app. Starts its own dev server on a free port and never touches the user's 8081.
---

# Run Glowire

**Plain `/run-glowire` with no other request:** the user just wants to play. Run `start`,
then `open`, tell them the URL, and stop there. Don't run `play` or take screenshots.

Glowire is an Expo SDK 57 / React Native game. On a PC it runs as the **Expo web build**
(react-native-web + three.js), which is what you drive. Everything goes through one
dependency-free Node script, run from the repo root (all paths here are relative to it):

```
.claude/skills/run-glowire/driver.mjs
```

It starts Metro on the **first free port ≥ 8100** (the user usually has their own
`expo start --web --port 8081` running; it is never reused or killed), opens the game in
the user's Chrome, and drives a **separate headless Chrome** over the DevTools protocol for
clicks, keys, drags and screenshots. Screenshots land in `.expo/shots/` (gitignored).

## Prerequisites

Node 24 (built-in `fetch`/`WebSocket` are used), Google Chrome installed (found at
`C:\Program Files\Google\Chrome\Application\chrome.exe`; set `CHROME_PATH` otherwise),
`npm install` done.

## Run (agent path)

```bash
node .claude/skills/run-glowire/driver.mjs start     # ~20s; prints "ready: http://localhost:8100"
node .claude/skills/run-glowire/driver.mjs open      # opens it in the user's Chrome (new window)
node .claude/skills/run-glowire/driver.mjs status
```

Drive it with `play`: each argument is one step, run in order in a fresh headless Chrome
(844×390 = phone landscape; `--size W,H` to change). Then **Read the PNGs** to check them.

```bash
# World: clear the intro story, walk the hero
node .claude/skills/run-glowire/driver.mjs play "goto world/glowtown" "dialog" \
  "hold ArrowRight 1200" "hold ArrowDown 500" "shot w2-walked.png"

# Puzzle 1-1, solved end to end (ends on "Job done!" with 3 stars, 5.5 mA)
node .claude/skills/run-glowire/driver.mjs play "goto level/1" "tap Got it!" \
  "drag 792,62 640,140 487,172" \
  "drag 423,170 423,124 487,124 551,124 551,170" \
  "drag 423,200 423,250 487,250 551,250 551,200" \
  "wait 1500" "shot l1-solved.png" "text"

# Home screen -> Glowtown via the real button
node .claude/skills/run-glowire/driver.mjs play "shot p1-home.png" "tap Start" "wait 2500" "text"
```

| Step | Does |
|---|---|
| `goto <route>` | `/`, `world/glowtown`, `world/harbour`, `level/<n>`, `shop`, `daily` |
| `dialog` | taps through the story dialog until it closes (walking is blocked until then) |
| `tap <text>` | clicks the visible element whose text is exactly `<text>` (retries 5s) |
| `click x,y` | real mouse click, CSS px |
| `drag x,y x,y …` | press, glide through points, release (wires; dragging parts from the tray) |
| `hold <Key> <ms>` / `key <Key> [n]` | arrows/WASD walk while held; `e`/Enter = talk |
| `wait <ms>` · `shot <file.png>` · `text` · `eval <js>` | sleep, screenshot, dump page text, run JS |

Page errors/warnings are printed at the end of each `play` run. Two warnings are normal:
`useNativeDriver is not supported` and `THREE.Clock … deprecated`.

Quick one-off screenshot without steps: `node .claude/skills/run-glowire/driver.mjs shot world/glowtown`
→ `.expo/shots/world_glowtown.png`.

Stop **only our** server (taskkill on the PID we started; 8081 is untouched):

```bash
node .claude/skills/run-glowire/driver.mjs stop
```

## Run (human path)

`npm start` / `npx expo start --web` on 8081, or Expo Go on an iPhone via QR (see README).
Useless headless, and 8081 is usually already the user's.

## Test

```bash
npm test            # vitest, 218 tests
npx eslint .claude/skills/run-glowire/driver.mjs
```

## Gotchas

- **Each `play` is a fresh browser profile** → fresh save (`localStorage` key `glowire-save`),
  so the intro story plays every time you enter a world. Use the `dialog` step first. The
  user's Chrome on :8100 is a different origin from :8081, so it doesn't touch their save either.
- **Dialog text uses EN SPACES (U+2002)** in the pixel UI: `"tap ▼"`, `"tap to close"`,
  `"Got it!"`. Plain `includes('tap ▼')` never matches; the driver normalises with `\s`.
  Lines type out letter by letter, and the prompt only appears once a line is done.
- **Dragged parts are drawn above the finger**: a resistor released at y lands one cell
  (~64px) higher. Board cells for level 1 at 844×390 are centred at x = 359/423/487/551/615,
  y = 60/124/186/250/314 (battery at 423,186, LED at 551,186). Place parts **before** wiring:
  wiring battery→LED with no resistor burns the LED out (☆ lost).
- **Git Bash rewrites `/route` args** into `C:/Program Files/Git/route`. The driver undoes
  this, but writing routes without a leading slash (`world/glowtown`) avoids it entirely.
- `expo start --web` would pop a browser by itself; the driver sets `BROWSER=none` and opens
  Chrome explicitly only on `open`.
- Claude in Chrome tools can't drive the headless browser; they *can* drive the window from
  `open` if the extension is connected (it wasn't when this was written), so the CDP `play`
  path is the reliable one.
- `start` pre-fetches the 10.6 MB web bundle (~7s warm) so the first page load isn't blank.
  Server log: `.expo/run-glowire.log`; state: `.expo/run-glowire.json`.

## Troubleshooting

- Screenshot shows the **Google new-tab page** → the URL was mangled (Git Bash path
  conversion). Use routes without a leading slash.
- `(left temp profile …glowire-cdp-9300)` → Chrome still held its profile at exit; harmless,
  delete `%TEMP%\glowire-cdp-*` if you care.
- `tap: no visible element with text "…"` → check exact text with a `text` step; the popup
  may not exist on that screen (e.g. "Got it!" only appears for a level's new part).
- Came up on **8101** instead of 8100 → you restarted right after `stop` and the old port was
  still being released. Expected; always read the URL from `start`/`status`, never assume 8100.
- `server not running` → `start` first; `status` checks the PID *and* an HTTP 200.
