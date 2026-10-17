/**
 * Atom literal → numeric value.
 *
 * A note is a letter a-g, optional accidentals (# sharp / b flat, repeatable),
 * and an optional (possibly multi-digit) octave. Default octave is 4.
 * MIDI numbering: c4 = 60, c#4 = 61, bb3 = 58, a4 = 69.
 *
 * A bare number ("12", "0.5", "-3", ".75") is its own numeric value.
 */

import { noteNameToSemis } from "../../units/note-name";
import { notationError } from "./notation-error";

const NUMBER_RE = /^[+-]?(?:\d+\.?\d*|\.\d+)$/;

/** True if the token text is a plain numeric literal. */
export const isNumber = (text: string): boolean => NUMBER_RE.test(text);

/** Parse an atom literal to its numeric value, or throw with the reason. */
export function atomValue(text: string, pos: number): number {
	if (isNumber(text)) return Number(text);

	const semis = noteNameToSemis(text);
	if (semis === undefined) throw notationError(`invalid note or number '${text}'`, pos, text.length);
	return semis;
}
