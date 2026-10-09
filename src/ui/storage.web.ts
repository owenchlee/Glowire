// Web previews keep the save in localStorage.

const KEY = 'glowire-save';

export function loadSave(): unknown {
  try {
    const raw = globalThis.localStorage?.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function writeSave(data: unknown): void {
  try {
    globalThis.localStorage?.setItem(KEY, JSON.stringify(data));
  } catch {
    // Ignore: private mode or storage full.
  }
}
