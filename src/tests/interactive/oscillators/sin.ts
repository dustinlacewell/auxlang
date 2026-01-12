/**
 * sin - Sine oscillator
 *
 * Inputs:
 *   freq: number (default: 440) - oscillator frequency
 *   min: number (default: -1) - output minimum
 *   max: number (default: 1) - output maximum
 *
 * Config:
 *   shape: function - waveform shape (fixed to sin)
 *
 * Outputs:
 *   audio: shaped waveform
 */

import type { TestDefinition } from "../types";

export const sinDefault: TestDefinition = {
	id: "sin-default",
	category: "Oscillators",
	name: "sin - defaults",
	desc: "Pure sine at 440Hz",
	code: `sin().out()`,
};

export const sinAllParams: TestDefinition = {
	id: "sin-all-params",
	category: "Oscillators",
	name: "sin - all params",
	desc: "Sine at 330Hz with custom range",
	code: `sin({ freq: 330, min: -0.5, max: 0.5 }).out()`,
};

export const sinModFreq: TestDefinition = {
	id: "sin-mod-freq",
	category: "Oscillators",
	name: "sin - modulated freq",
	desc: "Sine with vibrato from LFO",
	code: `sin(lfo(5, 438, 442)).out()`,
};

export const sinShowcase: TestDefinition = {
	id: "sin-showcase",
	category: "Oscillators",
	name: "sin - showcase",
	desc: "FM bell using sine as modulator",
	code: `clock(60).seq("c5 e5 g5 c6").apply(s =>
  sin(s.cv.add(sin(s.cv.mult(2)).scale({ from: -1, to: 1, min: -50, max: 50 })))
    .gain({ level: s.gate.adsr({ attack: 0.01, decay: 0.3, sustain: 0, release: 0.2 }) })
    .out()
)`,
};

export const sinTests = [sinDefault, sinAllParams, sinModFreq, sinShowcase];
