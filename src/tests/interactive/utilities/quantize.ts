/**
 * quantize - Quantize frequency to scale
 *
 * Inputs:
 *   input: signal (default: 440) - frequency to quantize
 *   root: number (default: 0) - root note 0-11 (0=C)
 *   octave: number (default: 3) - base octave
 *   range: number (default: 4) - octave range
 *
 * Config:
 *   scaleName: string (default: "major") - scale name
 *
 * Outputs:
 *   freq: quantized frequency
 */

import type { TestDefinition } from "../types";

export const quantizeDefault: TestDefinition = {
	id: "quantize-default",
	category: "Utilities",
	name: "quantize - defaults",
	desc: "Quantize LFO to major scale",
	code: `lfo(0.5, 200, 800).quantize().tri().out()`,
};

export const quantizeAllParams: TestDefinition = {
	id: "quantize-all-params",
	category: "Utilities",
	name: "quantize - all params",
	desc: "Quantize to A minor pentatonic",
	code: `lfo(0.3, 200, 600).quantize({ root: 9, octave: 3, range: 2, scale: "minor pentatonic" }).tri().out()`,
};

export const quantizeModInput: TestDefinition = {
	id: "quantize-mod-input",
	category: "Utilities",
	name: "quantize - modulated input",
	desc: "Random frequencies quantized to blues",
	code: `clock(180).seq("c4*4").apply(s =>
  sah({ input: noise(), trig: s.trig })
    .scale({ from: -1, to: 1, min: 150, max: 600 })
    .quantize({ scale: "blues" })
    .tri()
    .gain({ level: s.gate.env() })
    .out()
)`,
};

export const quantizeShowcase: TestDefinition = {
	id: "quantize-showcase",
	category: "Utilities",
	name: "quantize - showcase",
	desc: "Generative melody in dorian mode",
	code: `clock(120).seq("c4*8").apply(s =>
  sah({ input: lfo(3, 150, 500), trig: s.trig })
    .quantize({ scale: "dorian", root: 2 })
    .tri()
    .lpf({ cutoff: 1500 })
    .gain({ level: s.gate.env({ attack: 0.01, release: 0.1 }) })
    .out()
)`,
};

export const quantizeTests = [quantizeDefault, quantizeAllParams, quantizeModInput, quantizeShowcase];
