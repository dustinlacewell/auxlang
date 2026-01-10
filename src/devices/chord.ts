/**
 * Chord device - takes a root frequency and outputs polyphonic frequencies.
 *
 * @example
 * ```javascript
 * // Chained from seq - root comes from cv, chordName is positional
 * seq("c3 f3 g3").clk(clock(60)).cv.chord("maj7").saw().out()
 *
 * // Standalone with positional args
 * chord(261.63, "maj").saw().out()
 *
 * // Object style
 * chord({ root: 261.63, chordName: "maj7" }).saw().out()
 * ```
 */

import { ChordType, Interval } from "tonal";
import { device } from "../descriptor/device";
import { inputs } from "../descriptor/inputs";
import { poly } from "../descriptor/poly";

// Get semitones for a chord type
function getChordSemitones(chordName: string): number[] {
	const chordData = ChordType.get(chordName);
	if (!chordData.intervals || chordData.intervals.length === 0) {
		return [0, 4, 7]; // major triad fallback
	}
	return chordData.intervals.map((i) => Interval.semitones(i) ?? 0);
}

// Precompute semitones for common chord types
const CHORD_SEMITONES: Record<string, number[]> = {
	// Triads
	maj: getChordSemitones("major"),
	min: getChordSemitones("minor"),
	dim: getChordSemitones("diminished"),
	aug: getChordSemitones("augmented"),
	sus2: getChordSemitones("suspended second"),
	sus4: getChordSemitones("suspended fourth"),
	// Sevenths
	maj7: getChordSemitones("major seventh"),
	min7: getChordSemitones("minor seventh"),
	dom7: getChordSemitones("dominant seventh"),
	dim7: getChordSemitones("diminished seventh"),
	m7b5: getChordSemitones("half-diminished"),
	minmaj7: getChordSemitones("minor/major seventh"),
	aug7: getChordSemitones("augmented seventh"),
	// Extended
	maj9: getChordSemitones("major ninth"),
	min9: getChordSemitones("minor ninth"),
	dom9: getChordSemitones("dominant ninth"),
	// Power chord
	"5": getChordSemitones("fifth"),
};

/**
 * Create a chord voice device for a specific semitone offset.
 * Uses config to pass the semitone offset so it survives serialization.
 */
function createChordVoice(semitoneOffset: number) {
	// Store semitoneOffset in config so it's available after process serialization
	const semiFn = new Function(`return ${semitoneOffset}`) as () => number;

	return device({
		inputs: inputs({ root: 261.63 }),
		config: { semi: semiFn },
		outputs: ["freq"],
		defaultInput: "root",
		defaultOutput: "freq",
		process(inp, cfg) {
			const rootFreq = (inp.root as number) ?? 261.63;
			const semi = cfg.semi();
			const freq = rootFreq * Math.pow(2, semi / 12);
			return { freq };
		},
	});
}

/**
 * Chord device with expand - creates poly based on chord type.
 */
export const chord = device("chord", {
	inputs: inputs({ root: 261.63 }),
	config: { chordName: "maj" },
	outputs: ["freq"],
	defaultInput: "root",
	defaultOutput: "freq",
	positionalArgs: ["root", "chordName"],
	expand(config, _inputBindings) {
		const chordName = (config.chordName as string) ?? "maj";
		const semitones = CHORD_SEMITONES[chordName] ?? [0, 4, 7];

		// Create one voice per chord tone
		const voices = semitones.map((semi) => createChordVoice(semi));
		return poly(voices);
	},
});
