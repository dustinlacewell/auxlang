import { device } from "../descriptor/device";
import { inputs } from "../descriptor/inputs";

/** Standard waveform shapes */
const shapes = {
	sin: (p: number) => Math.sin(p * Math.PI * 2),
	saw: (p: number) => p * 2 - 1,
	tri: (p: number) => 1 - 4 * Math.abs(p - 0.5),
	sqr: (p: number) => (p < 0.5 ? 1 : -1),
};

type ShapeFn = (phase: number) => number;

/** Create an oscillator device with a given default shape */
function createOsc(defaultShape: ShapeFn) {
	return device({
		inputs: inputs({ freq: 440, min: -1, max: 1, phase: 0, detune: 0 }),
		config: { shape: defaultShape, poly: 1 },
		outputs: ["out"],
		defaultInput: "freq",
		defaultOutput: "out",
		process(inp, cfg, state, sampleRate) {
			const freqsIn = inp.freq ?? [440];
			const mins = inp.min ?? [-1];
			const maxs = inp.max ?? [1];
			const initPhases = inp.phase ?? [0];
			const polyCount = Math.max(1, Math.floor(cfg.poly));
			const detuneCents = (inp.detune ?? [0])[0] ?? 0;

			// Expand frequencies for unison voices
			// Each input freq becomes polyCount voices with symmetric detuning
			const freqs: number[] = [];
			for (let i = 0; i < freqsIn.length; i++) {
				const baseFreq = freqsIn[i] ?? 440;
				if (polyCount === 1) {
					freqs.push(baseFreq);
				} else {
					// Spread voices symmetrically: e.g. for 4 voices and 10 cents,
					// offsets are -15, -5, +5, +15 cents (spread across -detune to +detune)
					for (let v = 0; v < polyCount; v++) {
						const t = polyCount === 1 ? 0 : (v / (polyCount - 1)) * 2 - 1; // -1 to +1
						const centsOffset = t * detuneCents;
						const detuned = baseFreq * Math.pow(2, centsOffset / 1200);
						freqs.push(detuned);
					}
				}
			}

			const numChannels = Math.max(freqs.length, mins.length, maxs.length, initPhases.length);

			if (!state.phases) state.phases = [];
			const phases = state.phases as number[];

			const out: number[] = [];
			for (let c = 0; c < numChannels; c++) {
				const freq = freqs[c % freqs.length] ?? 440;
				const min = mins[c % mins.length] ?? -1;
				const max = maxs[c % maxs.length] ?? 1;
				const initPhase = initPhases[c % initPhases.length] ?? 0;

				phases[c] = ((phases[c] ?? initPhase) + freq / sampleRate) % 1;
				const raw = cfg.shape(phases[c]);
				const normalized = (raw + 1) / 2;
				out.push(min + normalized * (max - min));
			}

			return { out };
		},
	});
}

/**
 * General-purpose oscillator with configurable waveform (default: sine).
 *
 * The shape function receives phase (0-1) and returns a value (typically -1 to 1).
 * Output is scaled from the shape's range to min..max.
 *
 * Examples:
 *   osc(440)                                    // sine at 440Hz
 *   osc(440).shape(p => p * 2 - 1)              // saw at 440Hz
 *   osc(4).min(200).max(1800)                   // LFO sweeping 200-1800
 */
export const osc = createOsc(shapes.sin);

/** Sine oscillator */
export const sin = createOsc(shapes.sin);

/** Sawtooth oscillator */
export const sawOsc = createOsc(shapes.saw);

/** Triangle oscillator */
export const tri = createOsc(shapes.tri);

/** Square oscillator */
export const sqr = createOsc(shapes.sqr);
