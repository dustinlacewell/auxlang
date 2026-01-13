/**
 * Chord device - takes a root frequency and outputs polyphonic frequencies.
 */

import { ChordType, Interval } from "tonal";
import { device } from "../device/device";
import { inputs } from "../device/inputs";

function getChordSemitones(chordName: string): number[] {
	const chordData = ChordType.get(chordName);
	if (!chordData.intervals || chordData.intervals.length === 0) {
		return [0, 4, 7];
	}
	return chordData.intervals.map((i) => Interval.semitones(i) ?? 0);
}

const CHORD_SEMITONES: Record<string, number[]> = {
	maj: getChordSemitones("major"),
	min: getChordSemitones("minor"),
	dim: getChordSemitones("diminished"),
	aug: getChordSemitones("augmented"),
	sus2: getChordSemitones("suspended second"),
	sus4: getChordSemitones("suspended fourth"),
	maj7: getChordSemitones("major seventh"),
	min7: getChordSemitones("minor seventh"),
	dom7: getChordSemitones("dominant seventh"),
	dim7: getChordSemitones("diminished seventh"),
	m7b5: getChordSemitones("half-diminished"),
	minmaj7: getChordSemitones("minor/major seventh"),
	aug7: getChordSemitones("augmented seventh"),
	maj9: getChordSemitones("major ninth"),
	min9: getChordSemitones("minor ninth"),
	dom9: getChordSemitones("dominant ninth"),
	"5": getChordSemitones("fifth"),
};

/** Anonymous device for a single chord tone */
const chordTone = device({
	inputs: inputs({ root: 261.63 }),
	config: { semi: 0 },
	outputs: ["freq"],
	defaultInput: "root",
	defaultOutput: "freq",
	process(inp, cfg) {
		const rootFreq = (inp.root as number) ?? 261.63;
		const semi = (cfg.semi as number) ?? 0;
		return { freq: rootFreq * Math.pow(2, semi / 12) };
	},
});

export const chord = device("chord", {
	inputs: inputs({ root: 261.63 }),
	config: { chordName: "maj" },
	outputs: ["freq"],
	defaultInput: "root",
	defaultOutput: "freq",
	positionalArgs: ["root", "chordName"],
	process(inp) {
		// Fallback for mono - just pass through root
		return { freq: (inp.root as number) ?? 261.63 };
	},
	expand(config, inputBindings) {
		const chordName = (config.chordName as string) ?? "maj";
		const semitones = CHORD_SEMITONES[chordName] ?? [0, 4, 7];

		// Create one chordTone node per chord tone
		return semitones.map((semi) =>
			chordTone({ root: inputBindings.root }, { semi }),
		);
	},
});
