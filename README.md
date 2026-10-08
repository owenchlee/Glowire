# Glowire

A cozy isometric puzzle game about electricity. Place and rotate circuit tiles (wires, LEDs,
resistors, a battery) on a small floating board, and watch current flow, all driven by a real
DC circuit solver.

**Status:** Phase 1 in progress (circuit engine + tutorial board).

## Requirements

- Node.js 20 or newer (developed on Node 24, Windows 11)
- An iPhone with **Expo Go** from the App Store (it must support Expo SDK 57)
- No Mac, Xcode or Android Studio needed

## Getting started

```bash
npm install
npm start          # starts the Metro dev server and prints a QR code
```

### Running on an iPhone from Windows (Expo Go)

1. Install **Expo Go** from the App Store.
2. Put the PC and the iPhone on the **same Wi‑Fi network**.
3. Run `npm start` in this folder.
4. Open the iPhone **Camera** app and point it at the QR code in the terminal. Tap the banner
   to open the project in Expo Go.
5. Save a file and the app reloads. Shake the phone to open the dev menu.

**If the phone can't connect:**

- The first time Node runs, Windows Firewall asks for permission. Allow it on **private
  networks**, and make sure your Wi‑Fi is set to _Private_ in Windows settings.
- Campus or public Wi‑Fi (for example eduroam) often blocks device-to-device traffic. Use a
  tunnel instead: `npx expo start --tunnel` (the first run offers to install `@expo/ngrok`).
- If Expo Go says the project is incompatible, update Expo Go from the App Store.

## Scripts

| Command                | What it does                                    |
| ---------------------- | ----------------------------------------------- |
| `npm start`            | Start the dev server (Expo Go / QR code)        |
| `npm test`             | Run the engine and board tests once (Vitest)    |
| `npm run test:watch`   | Run the tests in watch mode                     |
| `npm run typecheck`    | TypeScript strict type check                    |
| `npm run lint`         | ESLint (`eslint-config-expo` + Prettier compat) |
| `npm run format`       | Format everything with Prettier                 |
| `npm run format:check` | Check formatting without writing                |

## Project layout

```
app/          Expo Router screens (the tutorial screen)
src/engine/   Circuit physics: tile model, board → circuit, MNA solver. Pure TypeScript,
              no React / React Native (enforced by an ESLint rule). Tested with Vitest.
src/board/    Board state and actions (place, rotate, remove), separate from rendering
src/render/   3D scene: board, tile meshes, current-flow effects, LED glow
```

## Tech choices (Expo SDK 57)

| Package                        | Version | Why                                                      |
| ------------------------------ | ------- | -------------------------------------------------------- |
| `expo`                         | ~57.0   | Latest stable SDK; React Native 0.86, React 19.2         |
| `expo-router`                  | ~57.0   | File-based routing                                       |
| `three`                        | ~0.186  | 3D engine (pure JS)                                      |
| `@react-three/fiber`           | ~9.8    | React renderer for three; `/native` entry uses `expo-gl` |
| `expo-gl`                      | ~57.0   | OpenGL ES context; bundled in Expo Go                    |
| `react-native-gesture-handler` | ~2.32   | Taps and drags; bundled in Expo Go                       |
| `vitest`                       | 5.0     | Engine tests (dev only)                                  |

Every runtime dependency is either pure JavaScript or an Expo SDK module that ships in Expo Go,
so the same code runs in Expo Go and builds with EAS for an iOS release without custom native
code. `@react-three/drei` is deliberately not installed: most of its helpers assume a browser DOM, and the
few we need (rounded boxes, simple sprites) come straight from three.js.

## Privacy

Glowire collects no data: no analytics, ads, accounts, tracking SDKs or network calls.

## Shipping (later)

`app.json` already sets the app name (`Glowire`) and the bundle identifier
`com.owenlee.glowire` (placeholder), ready for `npx eas-cli@latest build -p ios`.
