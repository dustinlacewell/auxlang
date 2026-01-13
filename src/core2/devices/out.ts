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
import { inputs } from "../device/inputs";

export const outDevice = device("out", {
	inputs: inputs({ input: 0, gain: 1, sidechain: 0 }),
	outputs: ["signal"],
	defaultInput: "input",
	defaultOutput: "signal",
	process(inp, _cfg, _state, _sampleRate, _time, out) {
		const input = (inp.input as number) ?? 0;
		const gain = (inp.gain as number) ?? 1;
		const sidechain = (inp.sidechain as number) ?? 0;

		// Sidechain ducking: 0 = no duck, 1 = full duck
		const duck = 1 - Math.max(0, Math.min(1, sidechain));

		out.signal = input * gain * duck;
	},
});
