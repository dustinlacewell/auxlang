import { device } from "../device/device";

/**
 * Clock divider - divides phase by N.
 *
 * Input phase is divided, so events happen at 1/N speed.
 * Trigger fires when floor(outputPhase) changes.
 */
export const clockDiv = device("clockDiv", {
	inputs: { phase: 0, by: 4 },
	outputs: ["phase", "trig"],
	defaultInput: "phase",
	defaultOutput: "phase",
	positionalArgs: ["by"],
	process(inp, _cfg, state, _sampleRate, _time, out) {
		const phase = inp.phase as number;
		const div = Math.max(1, (inp.by as number) ?? 4);

		const outPhase = phase / div;
		const beat = Math.floor(outPhase);
		const lastBeat = (state.lastBeat as number) ?? -1;
		const trig = beat !== lastBeat ? 1 : 0;

		state.lastBeat = beat;

		out.phase = outPhase;
		out.trig = trig;
	},
});

/**
 * Clock multiplier - multiplies phase by N.
 *
 * Input phase is multiplied, so events happen at Nx speed.
 * Trigger fires when floor(outputPhase) changes.
 */
export const clockMult = device("clockMult", {
	inputs: { phase: 0, by: 2 },
	outputs: ["phase", "trig"],
	defaultInput: "phase",
	defaultOutput: "phase",
	positionalArgs: ["by"],
	process(inp, _cfg, state, _sampleRate, _time, out) {
		const phase = inp.phase as number;
		const mult = Math.max(0.1, (inp.by as number) ?? 2);

		const outPhase = phase * mult;
		const beat = Math.floor(outPhase);
		const lastBeat = (state.lastBeat as number) ?? -1;
		const trig = beat !== lastBeat ? 1 : 0;

		state.lastBeat = beat;

		out.phase = outPhase;
		out.trig = trig;
	},
});
