/**
 * pick - Selects a specific voice from poly
 *
 * Note: With compile-time poly decomposition, pick is a pass-through.
 * It's kept for API compatibility.
 *
 * Inputs:
 *   input: signal
 *
 * Outputs:
 *   signal: selected voice
 */

import type { TestDefinition } from "../types";

// Default: pick voice 0
export const pickDefault: TestDefinition = {
	id: "pick-default",
	category: "Utilities",
	name: "pick - defaults",
	desc: "Pick first voice (pass-through)",
	code: `sin(440).gain(0.3).out()`,
};

// All params: pick specific voice index
export const pickAllParams: TestDefinition = {
	id: "pick-all-params",
	category: "Utilities",
	name: "pick - all params",
	desc: "Pick from mono source",
	code: `sin(330).gain(0.3).out()`,
};

// Modulated: pick with modulated source
export const pickModInput: TestDefinition = {
	id: "pick-mod-input",
	category: "Utilities",
	name: "pick - modulated input",
	desc: "Pick from modulated source",
	code: `sin(sin(0.5, 300, 500)).gain(0.3).out()`,
};

// Showcase: practical use with sequencer
export const pickShowcase: TestDefinition = {
	id: "pick-showcase",
	category: "Utilities",
	name: "pick - showcase",
	desc: "Mono synth voice",
	code: `clock(120).seq("c3 e3 g3 c4").apply(s =>
  s.saw()
    .lpf(1200, 0.2)
    .gain({ level: s.gate.adsr() })
    .gain(0.3)
    .out()
)`,
};

export const pickTests = [pickDefault, pickAllParams, pickModInput, pickShowcase];
