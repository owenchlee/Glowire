// The campaign: chapters in order, each adding one idea. See docs/DESIGN.md.

import { CHAPTER_1 } from './chapter1';
import { CHAPTER_2 } from './chapter2';
import { CHAPTER_3 } from './chapter3';
import { CHAPTER_4 } from './chapter4';
import type { ChapterDef, LevelDef } from './types';

export const CHAPTERS: ChapterDef[] = [CHAPTER_1, CHAPTER_2, CHAPTER_3, CHAPTER_4];

/** Every level in play order. Ids are global and never reused (saved progress uses them). */
export const LEVELS: LevelDef[] = CHAPTERS.flatMap((c) => c.levels);

export function getLevel(id: number): LevelDef | undefined {
  return LEVELS.find((l) => l.id === id);
}

export function chapterOf(id: number): ChapterDef | undefined {
  return CHAPTERS.find((c) => c.levels.some((l) => l.id === id));
}

/** The level's number as players see it, e.g. "2-4", or "2-Boss" for a boss fight. */
export function levelNumber(id: number): string {
  const chapter = chapterOf(id);
  if (!chapter) return String(id);
  if (getLevel(id)?.boss) return `${chapter.id}-Boss`;
  return `${chapter.id}-${chapter.levels.findIndex((l) => l.id === id) + 1}`;
}

/** The level after this one in play order, crossing into the next chapter. */
export function nextLevel(id: number): LevelDef | undefined {
  return LEVELS[LEVELS.findIndex((l) => l.id === id) + 1];
}
