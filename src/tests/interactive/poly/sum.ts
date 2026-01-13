/**
 * sum - Sums all poly voices to mono
 *
 * Inputs:
 *   input: poly signal
 *
 * Outputs:
 *   signal: summed mono output
 */

import type { TestDefinition } from "../types";

// Default: sum single voice (pass-through)
export const sumDefault: TestDefinition = {
	id: "sum-default",
	category: "Poly",
	name: "sum - defaults",
	desc: "Sum of single voice (pass-through)",
	code: `sin(440).sum().gain(0.3).out()`,
};

// All params: sum multiple voices
export const sumAllParams: TestDefinition = {
	id: "sum-all-params",
	category: "Poly",
	name: "sum - all params",
	desc: "Sum three oscillators to mono",
	code: `poly([sin(220), sin(330), sin(440)])
  .sum()
  .gain(0.2)
  .out()`,
};

// Modulated: sum of modulated voices
export const sumModInput: TestDefinition = {
	id: "sum-mod-input",
	category: "Poly",
	name: "sum - modulated input",
	desc: "Sum of LFO-modulated voices",
	code: `poly([
  sin(sin(0.3, 200, 250)),
  sin(sin(0.5, 300, 350)),
  sin(sin(0.7, 400, 450))
]).sum().gain(0.2).out()`,
};

// Showcase: chord progression summed to mono with effects
export const sumShowcase: TestDefinition = {
	id: "sum-showcase",
	category: "Poly",
	name: "sum - showcase",
	desc: "Summed chord with delay",
	code: `clock(90).seq("{c3,e3,g3} {d3,f3,a3}").apply(s =>
  s.saw()
    .lpf(800, 0.2)
    .gain({ level: s.gate.adsr() })
    .sum()
    .delay({ time: 0.3, feedback: 0.4, mix: 0.3 })
    .gain(0.3)
    .out()
)`,
};

export const sumTests = [sumDefault, sumAllParams, sumModInput, sumShowcase];
