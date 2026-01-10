/**
 * Parse pitch string and convert to frequency.
 *
 * Pitch format: note + optional accidental + optional octave
 * Examples: "c4", "f#3", "bb2", "d" (defaults to octave 4)
 */

const NOTE_SEMITONES: Record<string, number> = {
	c: 0,
	d: 2,
	e: 4,
	f: 5,
	g: 7,
	a: 9,
	b: 11,
};

const PITCH_REGEX = /^([a-g])([#b])?(\d)?$/;

/**
 * Convert a pitch string to frequency in Hz.
 *
 * @param pitch - Pitch string like "c4", "f#3", "bb2"
 * @returns Frequency in Hz
 *
 * @example
 * pitchToFreq("a4")   // 440
 * pitchToFreq("c4")   // 261.63
 * pitchToFreq("c#4")  // 277.18
 * pitchToFreq("c")    // 261.63 (default octave 4)
 */
export function pitchToFreq(pitch: string): number {
	const match = pitch.toLowerCase().match(PITCH_REGEX);
	if (!match) {
		throw new Error(`Invalid pitch: ${pitch}`);
	}

	const [, note, accidental, octaveStr] = match;
	if (!note) {
		throw new Error(`Invalid pitch: ${pitch}`);
	}

	const baseSemitone = NOTE_SEMITONES[note];
	if (baseSemitone === undefined) {
		throw new Error(`Invalid note name: ${note}`);
	}

	let semitone = baseSemitone;
	if (accidental === "#") semitone += 1;
	if (accidental === "b") semitone -= 1;

	const octave = octaveStr ? Number.parseInt(octaveStr, 10) : 4;

	// MIDI note number: C4 = 60
	const midi = (octave + 1) * 12 + semitone;

	// Equal temperament: freq = 440 * 2^((midi - 69) / 12)
	return 440 * 2 ** ((midi - 69) / 12);
}
