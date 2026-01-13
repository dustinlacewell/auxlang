/**
 * poly - Creates poly from discrete signals
 *
 * Inputs:
 *   input: signal or array of signals
 *
 * Outputs:
 *   signal: poly output (one voice per input)
 */

import type { TestDefinition } from "../types";

// Default: poly with single input
export const polyDefault: TestDefinition = {
	id: "poly-default",
	category: "Poly",
	name: "poly - defaults",
	desc: "Single voice poly (pass-through)",
	code: `sin(0.5, 200, 600).sin().gain(0.3).out()`,
};

// All params: poly with multiple discrete oscillators
export const polyAllParams: TestDefinition = {
	id: "poly-all-params",
	category: "Poly",
	name: "poly - all params",
	desc: "Three voice poly from array",
	code: `poly([sin(220), sin(330), sin(440)])
  .gain(0.2)
  .out()`,
};

// Modulated: each voice with different modulation
export const polyModInput: TestDefinition = {
	id: "poly-mod-input",
	category: "Poly",
	name: "poly - modulated voices",
	desc: "Poly voices with individual LFO modulation",
	code: `poly([
  sin(sin(0.5, 200, 300)),
  sin(sin(0.7, 300, 400)),
  sin(sin(0.9, 400, 500))
]).gain(0.15).out()`,
};

// Showcase: chord-like usage with filtering
export const polyShowcase: TestDefinition = {
	id: "poly-showcase",
	category: "Poly",
	name: "poly - showcase",
	desc: "Poly saw chord with filter sweep",
	code: `poly([saw(110), saw(138.6), saw(165)])
  .lpf(sin(0.2, 400, 2000), 0.3)
  .gain(0.15)
  .out()`,
};

export const polyTests = [polyDefault, polyAllParams, polyModInput, polyShowcase];
