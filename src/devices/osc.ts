import { device } from "../descriptor/device";
import { inputs } from "../descriptor/inputs";
import type { ProcessFn } from "../descriptor/types";

/** Standard waveform shapes */
const shapes = {
	sin: (p: number) => Math.sin(p * Math.PI * 2),
	saw: (p: number) => p * 2 - 1,
	tri: (p: number) => 1 - 4 * Math.abs(p - 0.5),
	sqr: (p: number) => (p < 0.5 ? 1 : -1),
};

type ShapeFn = (phase: number) => number;

type OscInputs = { freq: number; min: number; max: number; phase: number };
type OscConfig = { shape: ShapeFn };
type OscOutputs = { out: number };

const oscProcess: ProcessFn<OscInputs, OscConfig, OscOutputs> = (inp, cfg, state, sampleRate) => {
	state.phase = ((state.phase as number) ?? inp.phase) + inp.freq / sampleRate;
	state.phase = (state.phase as number) % 1;

	// Shape function returns value in some range (typically -1 to 1)
	// We normalize to 0..1 then scale to min..max
	const raw = cfg.shape(state.phase as number);
	const normalized = (raw + 1) / 2;
	return { out: inp.min + normalized * (inp.max - inp.min) };
};

/** Create an oscillator device with a given default shape */
function createOsc(defaultShape: ShapeFn) {
	return device({
		inputs: inputs({ freq: 440, min: -1, max: 1, phase: 0 }),
		config: { shape: defaultShape },
		outputs: ["out"],
		defaultInput: "freq",
		defaultOutput: "out",
		process: oscProcess,
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
