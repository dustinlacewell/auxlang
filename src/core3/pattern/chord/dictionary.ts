/**
 * Chord quality → intervals above the root (semitones). One built-in
 * dictionary; `.dict('ireal')` and `.dict('default')` both select it. These are
 * stacked-thirds voicings, not iReal's hand-curated ones — same harmony, a
 * plainer color — which is the honest synth-voice approximation for the port.
 */

export const CHORD_QUALITIES: Record<string, readonly number[]> = {
	"": [0, 4, 7],
	maj: [0, 4, 7],
	m: [0, 3, 7],
	min: [0, 3, 7],
	"7": [0, 4, 7, 10],
	maj7: [0, 4, 7, 11],
	m7: [0, 3, 7, 10],
	min7: [0, 3, 7, 10],
	m7b5: [0, 3, 6, 10],
	dim7: [0, 3, 6, 9],
	"6": [0, 4, 7, 9],
	m6: [0, 3, 7, 9],
	"9": [0, 4, 7, 10, 14],
	m9: [0, 3, 7, 10, 14],
	min9: [0, 3, 7, 10, 14],
	maj9: [0, 4, 7, 11, 14],
	sus4: [0, 5, 7],
	sus2: [0, 2, 7],
};

/** Intervals for a quality, or a loud error naming the known set. */
export function intervalsFor(quality: string): readonly number[] {
	const intervals = CHORD_QUALITIES[quality];
	if (!intervals) {
		throw new Error(
			`chord: unknown quality '${quality}'. Known: [${Object.keys(CHORD_QUALITIES)
				.filter((q) => q !== "")
				.join(", ")}]`,
		);
	}
	return intervals;
}
