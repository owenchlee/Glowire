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
    // Write a temp file, then replace the save in one atomic rename: a kill mid-write only damages the temp.
    const tmp = new File(Paths.document, 'glowire-save.tmp');
    if (!tmp.exists) tmp.create();
    tmp.write(JSON.stringify(data));
    tmp.moveSync(file(), { overwrite: true });
  } catch {
    // Ignore: the next change tries again.
  }
}
