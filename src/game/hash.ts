// FNV-1a string hash. Own file so light callers (title screen) do not pull in the daily puzzle's level code.

export function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}
