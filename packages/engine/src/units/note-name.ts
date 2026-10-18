/**
 * Note-name parsing: a letter a-g, optional accidentals (# sharp / b flat,
 * repeatable), and an optional (possibly multi-digit) octave. Default octave
 * is 4. MIDI numbering: c4 = 60, c#4 = 61, bb3 = 58, a4 = 69. The single rule
 * shared by the pattern notation (notation/note.ts) and chord anchors
 * (chord/chord.ts).
 */

export const LETTER_SEMITONE: Record<string, number> = {
	c: 0,
	d: 2,
	e: 4,
	f: 5,
	g: 7,
	a: 9,
	b: 11,
};

// b is ambiguous: bare "b" is the note B, but a leading "b" only counts as the
// note letter here (accidentals follow it). Flats are the b's AFTER the letter.
const NOTE_NAME_RE =/^([a-gA-G])([#b]*)(-?\d+)?$/;

/** The MIDI number for a note-name string, or `undefined` if it is not exactly one. */
export function noteNameToSemis(text: string): number | undefined {
	const m = NOTE_NAME_RE.exec(text);
	if (!m) return undefined;

	const letter = m[1]!.toLowerCase();
	const accidentals = m[2]!;
	const octave = m[3] !== undefined ? Number.parseInt(m[3], 10) : 4;

	let semis = LETTER_SEMITONE[letter]!;
	for (const acc of accidentals) semis += acc === "#" ? 1 : -1;

	return 12 + octave * 12 + semis;
}
