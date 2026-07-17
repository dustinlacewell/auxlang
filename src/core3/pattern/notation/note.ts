/**
 * Atom literal → numeric value.
 *
 * A note is a letter a-g, optional accidentals (# sharp / b flat, repeatable),
 * and an optional (possibly multi-digit) octave. Default octave is 4.
 * MIDI numbering: c4 = 60, c#4 = 61, bb3 = 58, a4 = 69.
 *
 * A bare number ("12", "0.5", "-3", ".75") is its own numeric value.
 */

const LETTER_SEMITONE: Record<string, number> = {
	c: 0,
	d: 2,
	e: 4,
	f: 5,
	g: 7,
	a: 9,
	b: 11,
};

const NUMBER_RE = /^[+-]?(?:\d+\.?\d*|\.\d+)$/;
const NOTE_RE = /^([a-gA-G])([#b]*)(-?\d+)?$/;

/** True if the token text is a plain numeric literal. */
export const isNumber = (text: string): boolean => NUMBER_RE.test(text);

/** Parse an atom literal to its numeric value, or throw with the reason. */
export function atomValue(text: string, pos: number): number {
	if (isNumber(text)) return Number(text);

	const m = NOTE_RE.exec(text);
	if (!m) throw new Error(`mini-notation: invalid note or number '${text}' (at position ${pos})`);

	const letter = m[1]!.toLowerCase();
	const accidentals = m[2]!;
	const octave = m[3] !== undefined ? Number.parseInt(m[3], 10) : 4;

	// b is ambiguous: bare "b" is the note B, but a leading "b" only counts as the
	// note letter here (accidentals follow it). Flats are the b's AFTER the letter.
	let semis = LETTER_SEMITONE[letter]!;
	for (const acc of accidentals) semis += acc === "#" ? 1 : -1;

	// MIDI: c4 = 60 => c0 = 12 => value = 12 + octave*12 + semitone-within-octave.
	return 12 + octave * 12 + semis;
}
