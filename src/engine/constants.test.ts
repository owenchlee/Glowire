import { describe, expect, it } from 'vitest';

import {
  AMMETER_RESISTANCE,
  BATTERY_INTERNAL_RESISTANCE,
  CURRENT_EPSILON,
  DIODE_MODEL,
  GMIN,
  LED_MODELS,
  OPEN_SWITCH_RESISTANCE,
  SHORT_CIRCUIT_CURRENT,
  THERMAL_VOLTAGE,
  VOLTMETER_RESISTANCE,
  WIRE_RESISTANCE,
} from './constants';

describe('engine constants', () => {
  it('ideal meters and gaps behave like wires and open circuits', () => {
    expect(AMMETER_RESISTANCE).toBeLessThanOrEqual(WIRE_RESISTANCE);
    expect(VOLTMETER_RESISTANCE).toBe(OPEN_SWITCH_RESISTANCE);
    expect(OPEN_SWITCH_RESISTANCE).toBeGreaterThan(1e6);
  });

  it('keeps numerical guards tiny and thermal voltage near kT/q at 300 K', () => {
    expect(GMIN).toBeGreaterThan(0);
    expect(GMIN).toBeLessThan(1e-9);
    expect(CURRENT_EPSILON).toBeGreaterThan(0);
    expect(CURRENT_EPSILON).toBeLessThan(1e-3);
    expect(THERMAL_VOLTAGE).toBeCloseTo(0.0259, 3);
  });

  it('battery internal resistance is small but real; short threshold is above a normal load', () => {
    expect(BATTERY_INTERNAL_RESISTANCE).toBeGreaterThan(WIRE_RESISTANCE);
    // 3 V across the internal resistance alone would exceed the short-circuit threshold
    expect(3 / BATTERY_INTERNAL_RESISTANCE).toBeGreaterThan(SHORT_CIRCUIT_CURRENT);
  });

  it('diode model is sane', () => {
    expect(DIODE_MODEL.ratedVoltage).toBeCloseTo(0.7);
    expect(DIODE_MODEL.ratedCurrent).toBeGreaterThan(0);
    expect(DIODE_MODEL.reverseVoltage).toBeGreaterThan(0);
  });

  it('LED colours differ by forward voltage: red < green < blue', () => {
    expect(LED_MODELS.red.ratedVoltage).toBeLessThan(LED_MODELS.green.ratedVoltage);
    expect(LED_MODELS.green.ratedVoltage).toBeLessThan(LED_MODELS.blue.ratedVoltage);
    for (const m of Object.values(LED_MODELS)) {
      expect(m.visibleCurrent).toBeLessThan(m.ratedCurrent);
      expect(m.ratedCurrent).toBeLessThan(m.maxCurrent);
    }
  });
});
