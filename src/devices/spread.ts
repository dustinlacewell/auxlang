/**
 * Spread device - distributes poly voices across stereo field.
 *
 * Takes N poly voices and outputs 2 voices (left and right channels).
 * Each input voice is panned based on its position: voice 0 = left, last = right.
 *
 * @example
 * ```javascript
 * // 3-voice chord spread across stereo
 * seq("{c4,e4,g4}").saw().spread().out()
 *
 * // With more voices - evenly distributed
 * poly([saw(220), saw(330), saw(440), saw(550)]).spread().out()
 * ```
 */

import { device } from "../descriptor/device";
import { inputs } from "../descriptor/inputs";
import { isPoly, poly, type PolyDescriptor } from "../descriptor/poly";
import type { AnyDescriptor, Signal } from "../descriptor/types";
import { add } from "./add";
import { gain } from "./gain";

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
 */
export const spread = device("spread", {
	inputs: inputs({ input: 0 }),
	outputs: ["out"],
	defaultInput: "input",
	defaultOutput: "out",
	polyphonic: true,
	expand(_config, inputBindings) {
		const input = inputBindings.input as Signal | PolyDescriptor | undefined;

		// Handle mono input: center pan (send equally to both L/R)
		if (!input || !isPoly(input)) {
			// Mono signal or missing - duplicate to both channels
			const monoSignal = input ?? 0;
			return poly([
				gain(monoSignal as Signal).level(0.5) as AnyDescriptor,
				gain(monoSignal as Signal).level(0.5) as AnyDescriptor,
			]);
		}

		const voices = input.voices;
		const n = voices.length;

		if (n === 1) {
			// Single voice - center
			return poly([
				gain(voices[0]!).level(0.5) as AnyDescriptor,
				gain(voices[0]!).level(0.5) as AnyDescriptor,
			]);
		}

		// Calculate pan positions: evenly distributed -1 to 1
		// For 2 voices: [-1, 1]
		// For 3 voices: [-1, 0, 1]
		// For 4 voices: [-1, -0.33, 0.33, 1]
		const panPositions = voices.map((_, i) => -1 + (2 * i) / (n - 1));

		// Create left and right mixes with appropriate gains
		// Linear pan law: leftGain = (1 - pan) / 2, rightGain = (1 + pan) / 2
		const leftVoices = voices.map((v, i) => {
			const pan = panPositions[i]!;
			const leftGain = (1 - pan) / 2; // -1 -> 1.0, 0 -> 0.5, 1 -> 0.0
			return gain(v).level(leftGain) as AnyDescriptor;
		});

		const rightVoices = voices.map((v, i) => {
			const pan = panPositions[i]!;
			const rightGain = (1 + pan) / 2; // -1 -> 0.0, 0 -> 0.5, 1 -> 1.0
			return gain(v).level(rightGain) as AnyDescriptor;
		});

		const leftMix = sumVoices(leftVoices);
		const rightMix = sumVoices(rightVoices);

		return poly([leftMix, rightMix]);
	},
});
