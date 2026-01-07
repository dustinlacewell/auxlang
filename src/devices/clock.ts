import { device } from "../descriptor/device";
import { inputs } from "../descriptor/inputs";

/**
 * Clock device - emits trigger pulses at a given rate.
 *
 * The `bpm` input sets the tempo in beats per minute.
 * The `swing` input adds swing feel (0 = straight, 0.5 = max swing).
 *
 * Outputs:
 * - `trig`: -bpm on first sample (reset with tempo), 1.0 at each beat, 0.0 otherwise
 * - `gate`: 1.0 for 50% of beat duration, 0.0 otherwise
 *
 * The reset signal (trig = -bpm) allows downstream sequencers to know the
 * tempo immediately without waiting for the first beat interval.
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
		const bpm = (inp.bpm ?? [120])[0] ?? 120;
		const swing = Math.max(0, Math.min(0.5, (inp.swing ?? [0])[0] ?? 0));

		const samplesPerBeat = (60 / bpm) * sampleRate;
		const phase = (state.phase as number) ?? 0;
		const beatCount = (state.beatCount as number) ?? 0;
		const hasReset = (state.hasReset as boolean) ?? false;

		if (!hasReset) {
			state.hasReset = true;
			state.phase = 0;
			state.beatCount = 0;
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
