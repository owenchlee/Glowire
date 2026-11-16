import { describe, expect, it } from 'vitest';

import { battery, led, resistor, wire } from '../engine/tiles';
import { GAMES } from '../game/games';
import { turnsToMatch } from './solution';

describe('turnsToMatch', () => {
  it('counts the clockwise taps that turn a corner into the wanted corner', () => {
    expect(turnsToMatch(wire('corner', 0), wire('corner', 0))).toBe(0);
    expect(turnsToMatch(wire('corner', 0), wire('corner', 1))).toBe(1);
    expect(turnsToMatch(wire('corner', 0), wire('corner', 3))).toBe(3);
  });

  it('treats a straight wire as done after two taps either way round', () => {
    expect(turnsToMatch(wire('straight', 0), wire('straight', 2))).toBe(0);
    expect(turnsToMatch(wire('straight', 0), wire('straight', 1))).toBe(1);
  });

  it('returns null when no turning can do the wanted job', () => {
    expect(turnsToMatch(wire('corner'), wire('tee'))).toBeNull();
    expect(turnsToMatch(resistor(100), resistor(220))).toBeNull();
    expect(turnsToMatch(led(0, 'red'), led(0, 'green'))).toBeNull();
    expect(turnsToMatch(battery(), led())).toBeNull();
  });

  it('respects polarity: an LED needs the right number of turns, a resistor does not', () => {
    expect(turnsToMatch(led(0), led(2))).toBe(2);
    expect(turnsToMatch(resistor(100, 0), resistor(100, 2))).toBe(0);
  });
});

describe('GAMES', () => {
  it('has an entry per game id, keyed by its own id, with a host and instructions', () => {
    expect(Object.keys(GAMES)).toEqual(expect.arrayContaining(['colours', 'signal']));
    for (const [key, info] of Object.entries(GAMES)) {
      expect(info.id).toBe(key);
      expect(info.title.length).toBeGreaterThan(0);
      expect(info.host.length).toBeGreaterThan(0);
      expect(info.how.length).toBeGreaterThan(20);
    }
  });
});
