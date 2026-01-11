/**
 * Spread device - distributes poly voices across stereo field with modulatable width.
 *
 * Takes N poly voices and outputs 2 voices (left and right channels).
 * Each input voice is panned based on its position: voice 0 = left, last = right.
 *
 * Width controls the stereo spread:
 * - width = 1: full stereo (voice 0 = left, last = right)
 * - width = 0: mono (all voices center)
 * - width = -1: reversed stereo (voice 0 = right, last = left)
 *
 * @example
 * ```javascript
 * // 3-voice chord spread across stereo
 * seq("{c4,e4,g4}").saw().spread().out()
 *
 * // Modulated width with LFO (pans between reversed and normal)
 * seq("{c4,e4,g4}").saw().spread({ width: lfo(0.5) }).out()
 *
 * // Narrow spread (closer to center)
 * poly([saw(220), saw(330), saw(440)]).spread({ width: 0.3 }).out()
 *
 * // Reversed stereo field
 * seq("{c4,e4,g4}").saw().spread({ width: -1 }).out()
 * ```
 */

import { device } from "../descriptor/device";
import { inputs } from "../descriptor/inputs";
import { isPoly, poly, type PolyDescriptor } from "../descriptor/poly";
import type { AnyDescriptor, Signal } from "../descriptor/types";
import { add } from "./add";
import { mult, sub } from "./math";

/**
 * Sum multiple voices using a chain of add() devices.
 */
function sumVoices(voices: AnyDescriptor[]): AnyDescriptor {
	if (voices.length === 0) {
		throw new Error("sumVoices requires at least one voice");
	}
	if (voices.length === 1) {
		return voices[0]!;
	}

	let result = voices[0]!;
	for (let i = 1; i < voices.length; i++) {
		result = add(result).to(voices[i]!) as AnyDescriptor;
	}
	return result;
}

/**
 * Spread device with polyphonic + expand.
 * Receives the full poly (not expanded per-voice) and creates L/R mixers.
 * Width is wired as a signal, allowing runtime modulation.
 *
 * Pan calculation at runtime:
 * - basePan = fixed per voice (-1 to 1)
 * - pan = basePan * width (width is signal)
 * - leftGain = (1 - pan) / 2
 * - rightGain = (1 + pan) / 2
 */
export const spread = device("spread", {
	inputs: inputs({ input: 0, width: 1 }),
	outputs: ["out"],
	defaultInput: "input",
	defaultOutput: "out",
	polyphonic: true,
	expand(_config, inputBindings) {
		const input = inputBindings.input as Signal | PolyDescriptor | undefined;
		const width = inputBindings.width as Signal;

		// Handle mono input: center pan (send equally to both L/R)
		if (!input || !isPoly(input)) {
			const monoSignal = input ?? 0;
			return poly([
				mult(monoSignal as Signal).by(0.5) as AnyDescriptor,
				mult(monoSignal as Signal).by(0.5) as AnyDescriptor,
			]);
		}

		const voices = input.voices;
		const n = voices.length;

		if (n === 1) {
			// Single voice - always center regardless of width
			return poly([
				mult(voices[0]!).by(0.5) as AnyDescriptor,
				mult(voices[0]!).by(0.5) as AnyDescriptor,
			]);
		}

		// For each voice, compute:
		// basePan = -1 + (2 * i) / (n - 1)  -- constant
		// pan = basePan * width             -- signal
		// leftGain = (1 - pan) / 2          -- signal
		// rightGain = (1 + pan) / 2         -- signal
		// leftContrib = voice * leftGain
		// rightContrib = voice * rightGain

		const leftVoices: AnyDescriptor[] = [];
		const rightVoices: AnyDescriptor[] = [];

		for (let i = 0; i < n; i++) {
			const voice = voices[i]!;
			const basePan = -1 + (2 * i) / (n - 1);

			// pan = basePan * width
			const pan = mult(width).by(basePan);

			// leftGain = (1 - pan) / 2
			// sub(pan).from(1) = 1 - pan, then mult by 0.5
			const oneMinusPan = sub(pan).from(1);
			const leftGain = mult(oneMinusPan).by(0.5);

			// rightGain = (1 + pan) / 2 = 0.5 + pan/2
			const onePlusPan = add(1).to(pan);
			const rightGain = mult(onePlusPan).by(0.5);

			// voice * gain
			const leftContrib = mult(voice).by(leftGain) as AnyDescriptor;
			const rightContrib = mult(voice).by(rightGain) as AnyDescriptor;

			leftVoices.push(leftContrib);
			rightVoices.push(rightContrib);
		}

		const leftMix = sumVoices(leftVoices);
		const rightMix = sumVoices(rightVoices);

		return poly([leftMix, rightMix]);
	},
});
