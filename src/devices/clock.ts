import { device } from "../descriptor/device";
import { inputs } from "../descriptor/inputs";

/**
 * Clock device - emits trigger pulses at a given rate.
 *
 * The `bpm` input sets the tempo in beats per minute.
 * The `swing` input adds swing feel (0 = straight, 0.5 = max swing).
 *
 * Outputs:
 * - `trig`: 1.0 for one sample at each beat, 0.0 otherwise
 * - `gate`: 1.0 for 50% of beat duration, 0.0 otherwise
 *
 * Examples:
 *   clock(120)              // 120 BPM clock
 *   clock(120).swing(0.2)   // 120 BPM with light swing
 */
export const clock = device({
	inputs: inputs({ bpm: 120, swing: 0 }),
	outputs: ["trig", "gate"],
	defaultInput: "bpm",
	defaultOutput: "trig",
	process(inp, _cfg, state, sampleRate) {
		const bpm = inp.bpm ?? 120;
		const swing = Math.max(0, Math.min(0.5, inp.swing ?? 0));

		// Samples per beat
		const samplesPerBeat = (60 / bpm) * sampleRate;

		// Initialize state
		const phase = (state.phase as number) ?? 0;
		const beatCount = (state.beatCount as number) ?? 0;

		// Swing affects even beats (0, 2, 4...) vs odd beats (1, 3, 5...)
		// Swing delays odd beats by a fraction of a beat
		const isOddBeat = beatCount % 2 === 1;
		const swingOffset = isOddBeat ? swing * samplesPerBeat : 0;

		// Advance phase
		const newPhase = phase + 1;

		// Check for beat crossing
		const beatThreshold = samplesPerBeat + swingOffset;
		const trig = newPhase >= beatThreshold ? 1 : 0;

		// Gate is high for first 50% of beat
		const gateThreshold = beatThreshold * 0.5;
		const gate = newPhase < gateThreshold ? 1 : 0;

		// Update state
		if (trig === 1) {
			state.phase = 0;
			state.beatCount = beatCount + 1;
		} else {
			state.phase = newPhase;
		}

		return { trig, gate };
	},
});
