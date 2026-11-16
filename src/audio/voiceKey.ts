// Which recorded voice line goes with a line of dialog: a short hash of who says it and what.
// Lines with live numbers in them never match a recording, so they stay text-only.

/** FNV-1a over `who|text`, as 8 hex digits. */
export function voiceKey(who: string, text: string): string {
  let h = 0x811c9dc5;
  for (const ch of `${who}|${text}`) {
    h ^= ch.codePointAt(0)!;
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}
