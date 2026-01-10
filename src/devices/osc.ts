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

/**
 * Create a mono oscillator device with a given default shape.
 * Inputs and outputs are plain numbers - polyphony handled by poly descriptor.
 */
function createOsc(name: string, defaultShape: ShapeFn) {
	return device(name, {
		inputs: inputs({ freq: 440, min: -1, max: 1 }),
		config: { shape: defaultShape },
		outputs: ["audio"],
		defaultInput: "freq",
		defaultOutput: "audio",
		process(inp, cfg, state, sampleRate) {
			const freq = (inp.freq as number) ?? 440;
			const min = (inp.min as number) ?? -1;
			const max = (inp.max as number) ?? 1;

			// Phase accumulator
			const phase = (((state.phase as number) ?? 0) + freq / sampleRate) % 1;
			state.phase = phase;

			// Apply shape and scale to range
			const raw = cfg.shape(phase);
			const normalized = (raw + 1) / 2;
			return { audio: min + normalized * (max - min) };
		},
	});
}

export const osc = createOsc("osc", shapes.sin);
export const sin = createOsc("sin", shapes.sin);
export const sawOsc = createOsc("sawOsc", shapes.saw);
export const tri = createOsc("tri", shapes.tri);
export const sqr = createOsc("sqr", shapes.sqr);
