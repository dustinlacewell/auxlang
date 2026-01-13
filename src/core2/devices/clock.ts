import { device } from "../device/device";
import { inputs } from "../device/inputs";

/**
 * Clock device - emits trigger pulses at a given rate.
 * Inputs/outputs are plain numbers.
 */
export const clock = device("clock", {
	inputs: inputs({ bpm: 120, swing: 0 }),
	outputs: ["trig", "gate"],
	defaultInput: "bpm",
	defaultOutput: "trig",
	process(inp, _cfg, state, sampleRate) {
		const bpm = (inp.bpm as number) ?? 120;
		const swing = Math.max(0, Math.min(0.5, (inp.swing as number) ?? 0));

		const samplesPerBeat = (60 / bpm) * sampleRate;
		const phase = (state.phase as number) ?? 0;
		const beatCount = (state.beatCount as number) ?? 0;
		const hasReset = (state.hasReset as boolean) ?? false;

		if (!hasReset) {
			state.hasReset = true;
			state.phase = 0;
			state.beatCount = 0;
			// Reset signal: negative value encodes BPM for downstream devices
			return { trig: -bpm, gate: 0 };
		}

		const isOddBeat = beatCount % 2 === 1;
		const swingOffset = isOddBeat ? swing * samplesPerBeat : 0;
		const newPhase = phase + 1;
		const beatThreshold = samplesPerBeat + swingOffset;
		const trig = newPhase >= beatThreshold ? 1 : 0;
		const gateThreshold = beatThreshold * 0.5;
		const gate = newPhase < gateThreshold ? 1 : 0;

		if (trig === 1) {
			state.phase = 0;
			state.beatCount = beatCount + 1;
		} else {
			state.phase = newPhase;
		}

		return { trig, gate };
	},
});
