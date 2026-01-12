/**
 * counter - Trigger counter
 *
 * Inputs:
 *   trig: signal (default: 0) - input trigger
 *   reset: signal (default: 0) - reset trigger
 *   max: number (default: 0) - wrap point (0 = no wrap)
 *
 * Outputs:
 *   count: current count value
 *   wrap: trigger when counter wraps
 */

import type { TestDefinition } from "../types";

export const counterDefault: TestDefinition = {
	id: "counter-default",
	category: "Timing",
	name: "counter - defaults",
	desc: "Count beats",
	code: `clock(120).apply(c =>
  counter(c).scale({ from: 0, to: 8, min: 200, max: 800 }).saw().gain(0.3).out()
)`,
};

export const counterAllParams: TestDefinition = {
	id: "counter-all-params",
	category: "Timing",
	name: "counter - all params",
	desc: "Counter with max wrap",
	code: `clock(120).apply(c =>
  counter(c).max(4).scale({ from: 0, to: 4, min: 200, max: 600 }).saw().gain(0.3).out()
)`,
};

export const counterModMax: TestDefinition = {
	id: "counter-mod-max",
	category: "Timing",
	name: "counter - modulated max",
	desc: "Varying loop length",
	code: `clock(120).apply(c =>
  counter(c).max(lfo(0.1, 2, 8)).scale({ from: 0, to: 8, min: 200, max: 800 }).saw().gain(0.3).out()
)`,
};

export const counterShowcase: TestDefinition = {
	id: "counter-showcase",
	category: "Timing",
	name: "counter - showcase",
	desc: "Step sequencer simulation",
	code: `clock(120).apply(c =>
  counter(c).max(8).scale({ from: 0, to: 8, min: 100, max: 500 })
    .quantize({ scale: "major" })
    .saw()
    .lpf({ cutoff: 800 })
    .gain(0.3)
    .out()
)`,
};

export const counterTests = [counterDefault, counterAllParams, counterModMax, counterShowcase];
