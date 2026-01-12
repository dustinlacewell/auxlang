/**
 * sah - Sample and Hold
 *
 * Inputs:
 *   input: signal (default: 0) - signal to sample
 *   trig: signal (default: 0) - trigger impulse
 *
 * Outputs:
 *   signal: held value
 */

import type { TestDefinition } from "../types";

export const sahDefault: TestDefinition = {
	id: "sah-default",
	category: "Utilities",
	name: "sah - defaults",
	desc: "Sample noise as pitch CV",
	code: `clock(120).seq("c4*4").apply(s =>
  sah({ input: noise(), trig: s.trig }).scale({ from: -1, to: 1, min: 200, max: 800 }).tri().gain({ level: s.gate.env() }).out()
)`,
};

export const sahAllParams: TestDefinition = {
	id: "sah-all-params",
	category: "Utilities",
	name: "sah - all params",
	desc: "Sample LFO as stepped pitch",
	code: `clock(120).seq("c4*2").apply(s =>
  sah({ input: lfo(3, 200, 800), trig: s.trig }).tri().gain({ level: s.gate.env() }).out()
)`,
};

export const sahModInput: TestDefinition = {
	id: "sah-mod-input",
	category: "Utilities",
	name: "sah - modulated input",
	desc: "Sample complex modulation",
	code: `clock(120).seq("c4*4").apply(s =>
  sah({ input: lfo(7).scale({ from: -1, to: 1, min: 200, max: 600 }), trig: s.trig }).tri().gain({ level: s.gate.env() }).out()
)`,
};

export const sahShowcase: TestDefinition = {
	id: "sah-showcase",
	category: "Utilities",
	name: "sah - showcase",
	desc: "Random quantized melody",
	code: `clock(180).seq("c4*4").apply(s =>
  sah({ input: noise(), trig: s.trig })
    .scale({ from: -1, to: 1, min: 200, max: 800 })
    .quantize({ scale: "minor pentatonic" })
    .tri()
    .gain({ level: s.gate.env({ attack: 0.01, release: 0.1 }) })
    .out()
)`,
};

export const sahTests = [sahDefault, sahAllParams, sahModInput, sahShowcase];
