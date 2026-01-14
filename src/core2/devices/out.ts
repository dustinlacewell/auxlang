/**
 * Output device - marks signals for audio output.
 *
 * Each out() call creates an out node. During poly expansion,
 * voices are distributed L/R round-robin.
 *
 * Inputs:
 *   input: signal - audio to output
 *   gain: number (default: 1) - output level
 *   sidechain: signal (default: 0) - ducking signal (0-1 reduces gain)
 *
 * Outputs:
 *   signal: processed output
 */

import { device } from "../device/device";

export const outDevice = device("out", {
	inputs: { input: 0, gain: 1, sidechain: 0 },
	outputs: ["signal"],
	defaultInput: "input",
	defaultOutput: "signal",
	process(inp, _cfg, _state, _sampleRate, _time, out) {
		const input = inp.input
		const gain = inp.gain
		const sidechain = inp.sidechain

		// Sidechain ducking: 0 = no duck, 1 = full duck
		const duck = 1 - Math.max(0, Math.min(1, sidechain));

		out.signal = input * gain * duck;
	},
});
