// A tiny JSON file in the app's document directory. Failures are swallowed: losing
// progress is better than crashing the game.

import { File, Paths } from 'expo-file-system';

const file = () => new File(Paths.document, 'glowire-save.json');

export function loadSave(): unknown {
  try {
    const f = file();
    return f.exists ? JSON.parse(f.textSync()) : null;
  } catch {
    return null;
  }
}

export function writeSave(data: unknown): void {
  try {
    const f = file();
    if (!f.exists) f.create();
    f.write(JSON.stringify(data));
  } catch {
    // Ignore: the next change tries again.
  }
}
