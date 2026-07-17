import { device } from "../device/device";

/**
 * Clock device - outputs continuous phase ramp and trigger pulses.
 *
 * Phase ramps forever at BPM rate, one unit per beat.
 * Trigger fires for one sample when floor(phase) changes.
 */
export const clock = device("clock", {
	inputs: { bpm: 120 },
	outputs: ["phase", "trig"],
	defaultInput: "bpm",
	defaultOutput: "phase",
	process(inp, _cfg, state, sampleRate, _time, out) {
		const bpm = inp.bpm;
		const phaseDelta = bpm / 60 / sampleRate;

		const phase = (state.phase as number) ?? 0;
		const lastBeat = (state.lastBeat as number) ?? -1;

		const newPhase = phase + phaseDelta;
		const beat = Math.floor(newPhase);
		const trig = beat !== lastBeat ? 1 : 0;

		state.phase = newPhase;
		state.lastBeat = beat;

		out.phase = newPhase;
		out.trig = trig;
	},
});
