import { device } from "../descriptor/device";
import { inputs } from "../descriptor/inputs";

// PolySignal format: {id: number, value: number}[]
type PolySignal = Array<{ id: number; value: number }>;

/**
 * Clock device - emits trigger pulses at a given rate.
 */
export const clock = device({
	inputs: inputs({ bpm: 120, swing: 0 }),
	outputs: ["trig", "gate"],
	defaultInput: "bpm",
	defaultOutput: "trig",
	process(inp, _cfg, state, sampleRate) {
		const bpmSig = (inp.bpm ?? []) as PolySignal;
		const swingSig = (inp.swing ?? []) as PolySignal;
		const bpm = bpmSig.length > 0 ? bpmSig[0]!.value : 120;
		const swing = Math.max(0, Math.min(0.5, swingSig.length > 0 ? swingSig[0]!.value : 0));

		const samplesPerBeat = (60 / bpm) * sampleRate;
		const phase = (state.phase as number) ?? 0;
		const beatCount = (state.beatCount as number) ?? 0;
		const hasReset = (state.hasReset as boolean) ?? false;

		if (!hasReset) {
			state.hasReset = true;
			state.phase = 0;
			state.beatCount = 0;
			// Return mono output with id 0
			return { trig: [{ id: 0, value: -bpm }], gate: [{ id: 0, value: 0 }] };
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

		return { trig: [{ id: 0, value: trig }], gate: [{ id: 0, value: gate }] };
	},
});
