/**
 * Convert note names to frequencies using equal temperament.
 * A4 = 440Hz, C4 = middle C = MIDI 60
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

/**
 * Convert a note name to frequency in Hz.
 *
 * @param name - Note name (a-g, case insensitive)
 * @param accidental - '#' for sharp, 'b' for flat, null for natural
 * @param octave - Octave number (4 = middle C octave)
 * @returns Frequency in Hz
 *
 * @example
 * noteToFreq('a', null, 4)  // 440
 * noteToFreq('c', null, 4)  // 261.63
 * noteToFreq('c', '#', 4)   // 277.18
 */
export function noteToFreq(name: string, accidental: "#" | "b" | null, octave: number): number {
	const baseSemitone = NOTE_SEMITONES[name.toLowerCase()];
	if (baseSemitone === undefined) {
		throw new Error(`Invalid note name: ${name}`);
	}

	let semitone = baseSemitone;
	if (accidental === "#") semitone += 1;
	if (accidental === "b") semitone -= 1;

	// MIDI note number: C4 = 60, so C0 = 12, and we add semitone offset
	// Formula: MIDI = (octave + 1) * 12 + semitone
	const midi = (octave + 1) * 12 + semitone;

	// Equal temperament: freq = 440 * 2^((midi - 69) / 12)
	// A4 = MIDI 69 = 440Hz
	return 440 * 2 ** ((midi - 69) / 12);
}
