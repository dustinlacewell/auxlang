import { device } from "../device/device";
import { inputs } from "../device/inputs";

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
		inputs: inputs({ freq: 440, min: -1, max: 1, phase: 0 }),
		config: { shape: defaultShape },
		outputs: ["cv"],
		defaultInput: "freq",
		defaultOutput: "cv",
		positionalArgs: ["freq", "min", "max", "phase"],
		process(inp, cfg, state, sampleRate) {
			const freq = (inp.freq as number) ?? 440;
			const min = (inp.min as number) ?? -1;
			const max = (inp.max as number) ?? 1;
			const initPhase = (inp.phase as number) ?? 0;

			// Phase accumulator
			const phase = (((state.phase as number) ?? initPhase) + freq / sampleRate) % 1;
			state.phase = phase;

			// Apply shape and scale to range
			const raw = (cfg.shape as ShapeFn)(phase);
			const normalized = (raw + 1) / 2;
			return { cv: min + normalized * (max - min) };
		},
	});
}

export const osc = createOsc("osc", shapes.sin);
export const sin = createOsc("sin", shapes.sin);
export const saw = createOsc("saw", shapes.saw);
export const tri = createOsc("tri", shapes.tri);
export const sqr = createOsc("sqr", shapes.sqr);
