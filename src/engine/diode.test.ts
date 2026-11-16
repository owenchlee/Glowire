import { describe, expect, it } from 'vitest';

import { GMIN, LED_MODELS, DIODE_MODEL } from './constants';
import { diodeModel, ledDiodeModel } from './circuit';
import { diodeEval, limitJunctionStep } from './mna';

describe('diode models', () => {
  it('fits each LED so junction plus series drop equals the rated voltage at rated current', () => {
    for (const color of ['red', 'green', 'blue'] as const) {
      const m = LED_MODELS[color];
      const d = ledDiodeModel(color);
      const vj = m.ratedVoltage - m.ratedCurrent * m.seriesResistance;
      expect(d.nVt).toBeGreaterThan(0);
      expect(d.is).toBeGreaterThan(0);
      expect(d.is * Math.expm1(vj / d.nVt)).toBeCloseTo(m.ratedCurrent, 9);
    }
  });

  it('needs a higher saturation-limited knee for blue than red', () => {
    expect(ledDiodeModel('blue').is).toBeLessThan(ledDiodeModel('red').is);
  });

  it('fits the plain diode to its rated point', () => {
    const m = DIODE_MODEL;
    const d = diodeModel();
    const vj = m.ratedVoltage - m.ratedCurrent * m.seriesResistance;
    expect(d.is * Math.expm1(vj / d.nVt)).toBeCloseTo(m.ratedCurrent, 9);
  });
});

describe('diodeEval', () => {
  const d = diodeModel();

  it('is zero current at 0 V and conducts only GMIN-level conductance', () => {
    const { i, g } = diodeEval(0, d);
    expect(i).toBe(0);
    expect(g).toBeCloseTo(d.is / d.nVt + GMIN, 15);
  });

  it('blocks in reverse: current is about -is plus leakage', () => {
    const { i } = diodeEval(-1, d);
    expect(i).toBeLessThan(0);
    expect(Math.abs(i)).toBeLessThan(1e-6);
  });

  it('grows monotonically with voltage and conductance matches the slope', () => {
    const lo = diodeEval(0.5, d);
    const hi = diodeEval(0.6, d);
    expect(hi.i).toBeGreaterThan(lo.i);
    const h = 1e-6;
    const slope = (diodeEval(0.6 + h, d).i - diodeEval(0.6 - h, d).i) / (2 * h);
    expect(hi.g / slope).toBeCloseTo(1, 4);
  });

  it('continues linearly past the exponent clamp instead of overflowing', () => {
    const v = d.nVt * 100;
    const a = diodeEval(v, d);
    const b = diodeEval(v * 2, d);
    expect(Number.isFinite(a.i)).toBe(true);
    expect(Number.isFinite(b.i)).toBe(true);
    expect(b.i).toBeGreaterThan(a.i);
    expect(diodeEval(v * 3, d).g).toBeCloseTo(b.g, 6);
  });
});

describe('limitJunctionStep', () => {
  const d = diodeModel();
  const vcrit = d.nVt * Math.log(d.nVt / (Math.SQRT2 * d.is));

  it('passes small steps and steps below vcrit through unchanged', () => {
    expect(limitJunctionStep(0.3, 0, d)).toBe(0.3);
    expect(limitJunctionStep(vcrit + 0.001, vcrit, d)).toBe(vcrit + 0.001);
  });

  it('tames a huge jump from 0 V to a smaller log-scaled voltage', () => {
    const next = limitJunctionStep(3, 0, d);
    expect(next).toBeLessThan(3);
    expect(next).toBeCloseTo(d.nVt * Math.log(3 / d.nVt), 12);
  });

  it('moves along the log of the step when already conducting', () => {
    const vOld = 0.7;
    const next = limitJunctionStep(2, vOld, d);
    expect(next).toBeGreaterThan(vOld);
    expect(next).toBeLessThan(2);
    expect(next).toBeCloseTo(vOld + d.nVt * Math.log(1 + (2 - vOld) / d.nVt), 12);
  });
});
