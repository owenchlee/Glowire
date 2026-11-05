// Web previews keep the save in localStorage.

const KEY = 'glowire-save';

export function loadSave(): unknown {
  let raw: string | null | undefined;
  try {
    raw = globalThis.localStorage?.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    // Unreadable: keep a copy so the next write does not destroy it for good.
    try {
      if (raw) globalThis.localStorage?.setItem(`${KEY}-corrupt`, raw);
    } catch {
      // Ignore: storage full.
    }
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
