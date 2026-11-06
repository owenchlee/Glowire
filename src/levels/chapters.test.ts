import { describe, expect, it } from 'vitest';

import { CHAPTER_1 } from './chapter1';
import { CHAPTER_2 } from './chapter2';
import { CHAPTER_3 } from './chapter3';
import { CHAPTER_4 } from './chapter4';
import { CHAPTER_5 } from './chapter5';
import { CHAPTER_6 } from './chapter6';
import { CHAPTERS, chapterOf } from './levels';

const ALL = [CHAPTER_1, CHAPTER_2, CHAPTER_3, CHAPTER_4, CHAPTER_5, CHAPTER_6];

describe('chapters', () => {
  it('CHAPTERS lists the six chapters in order with ids 1..6', () => {
    expect(CHAPTERS).toEqual(ALL);
    expect(ALL.map((c) => c.id)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it.each(ALL.map((c) => [c.id, c] as const))('chapter %i has a title, blurb and levels', (_id, c) => {
    expect(c.title.length).toBeGreaterThan(0);
    expect(c.blurb.length).toBeGreaterThan(0);
    expect(c.levels.length).toBeGreaterThan(0);
  });

  it('level ids are unique across all chapters', () => {
    const ids = ALL.flatMap((c) => c.levels.map((l) => l.id));
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('chapterOf finds the owning chapter of every level', () => {
    for (const c of ALL) for (const l of c.levels) expect(chapterOf(l.id)).toBe(c);
  });

  it('chapterOf returns undefined for an unknown id', () => {
    expect(chapterOf(-1)).toBeUndefined();
  });
});
