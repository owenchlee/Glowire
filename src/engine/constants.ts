// Physical constants and model parameters, all SI units.

/** Every wire tile (port to port) has this resistance so no loop is a perfect 0 Ω. */
export const WIRE_RESISTANCE = 0.01;

/** Internal resistance of 2 × AA alkaline cells in series (≈ 0.15 Ω each). */
export const BATTERY_INTERNAL_RESISTANCE = 0.3;

/**
 * An open switch is modelled as a very large resistance rather than removed, so its
 * terminals still exist as circuit nodes. 1 GΩ leaks 3 nA at 3 V: physically nothing.
 */
export const OPEN_SWITCH_RESISTANCE = 1e9;

/** Battery current above this is a short circuit. */
export const SHORT_CIRCUIT_CURRENT = 2;

/** Thermal voltage kT/q at 300 K. */
export const THERMAL_VOLTAGE = 0.025852;

/**
 * Conductance placed in parallel with every diode junction (SPICE's GMIN).
 * Keeps the matrix non-singular when a node is only reachable through
 * reverse-biased LEDs. 1e-12 S leaks 3 pA at 3 V: physically nothing.
 */
export const GMIN = 1e-12;

/** Currents below this count as "no current" when deciding statuses. */
export const CURRENT_EPSILON = 1e-6;

export interface LedModel {
  /** Rated forward voltage at the rated current (datasheet Vf). */
  ratedVoltage: number;
  /** Current at which the LED is at full brightness. */
  ratedCurrent: number;
  /** Above this the LED burns out. */
  maxCurrent: number;
  /** Below this the LED is too dim to see and counts as OFF. */
  visibleCurrent: number;
  /** Shockley emission coefficient (ideality factor). */
  emissionCoefficient: number;
  /** Bulk series resistance of the die and leads. */
  seriesResistance: number;
  /** A reverse voltage larger than this marks the LED as REVERSED. */
  reverseVoltage: number;
}

export const LED_MODELS: Record<'red', LedModel> = {
  red: {
    ratedVoltage: 2.0,
    ratedCurrent: 0.02,
    maxCurrent: 0.03,
    visibleCurrent: 0.0005,
    emissionCoefficient: 2,
    seriesResistance: 10,
    reverseVoltage: 0.5,
  },
};
