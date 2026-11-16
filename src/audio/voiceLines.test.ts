/// <reference types="vite/client" />
import { writeFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { voiceKey } from './voiceKey';

/** Every fixed line of dialog in the game's data, found by walking what each module exports. */
async function collect(): Promise<Map<string, { who: string; text: string }>> {
  const mods = import.meta.glob<unknown>(['../**/*.ts', '!../**/*.test.ts', '!../**/*.d.ts']);
  const out = new Map<string, { who: string; text: string }>();
  const add = (who: unknown, text: unknown) => {
    if (typeof who !== 'string' || typeof text !== 'string' || who === 'hero' || !text.trim()) return;
    out.set(voiceKey(who, text), { who, text });
  };
  const seen = new Set<object>();
  const walk = (v: unknown, depth: number) => {
    if (!v || typeof v !== 'object' || seen.has(v) || depth > 12) return;
    seen.add(v);
    const o = v as Record<string, unknown>;
    if (typeof o.who === 'string') {
      add(o.who, o.text);
      add(o.who, o.chat);
    }
    if (o.kind === 'sign') add('pip', o.text);
    const job = o.job as Record<string, unknown> | undefined;
    if (job && typeof job === 'object' && typeof job.client === 'string') {
      add(job.client, job.ask);
      add(job.client, job.thanks);
    }
    for (const x of Array.isArray(v) ? v : Object.values(o)) walk(x, depth + 1);
  };
  for (const load of Object.values(mods)) {
    try {
      walk(await load(), 0);
    } catch {
      // Modules that need React Native can't load in Node; dialog data never lives in them.
    }
  }
  return out;
}

describe('voice lines', () => {
  it('finds the story and the level jobs', async () => {
    const lines = await collect();
    expect(lines.size).toBeGreaterThan(300);
    const all = [...lines.values()];
    expect(all.some((l) => l.who === 'gran')).toBe(true);
    expect(all.some((l) => l.who === 'pell' && l.text.includes('tomatoes'))).toBe(true);
  });

  // Run with VOICE_LINES=1 to write the list scripts/voice.mjs records from.
  it.runIf(process.env.VOICE_LINES)('writes scripts/voice-lines.json', async () => {
    const lines = [...(await collect()).entries()].map(([key, l]) => ({ key, ...l }));
    writeFileSync('scripts/voice-lines.json', JSON.stringify(lines, null, 1));
  });
});
