/**
 * The step size a drag uses, from the digit under the pointer. The caret
 * sits inside a numeric literal's own text (e.g. "440" or "0.25", sign
 * included); `stepFromDigit` reads the digit at that index and returns the
 * place value it represents — the tens digit of "440" steps by 10, the
 * first decimal of "0.25" steps by 0.1. Shift (`fine`) divides the step
 * by 10.
 */

export function stepFromDigit(text: string, caretIndexInLiteral: number, fine = false): number {
	const index = clampIndex(text, caretIndexInLiteral);
	const dot = text.indexOf(".");
	const step = dot === -1 || index < dot ? integerStep(text, index, dot) : fractionStep(index, dot);
	return fine ? step / 10 : step;
}

function clampIndex(text: string, index: number): number {
	const last = text.length - 1;
	if (index < 0) return 0;
	if (index > last) return last;
	return index;
}

/** Place value of an integer-part digit: distance from the decimal point (or end), in powers of 10. */
function integerStep(text: string, index: number, dot: number): number {
	const end = dot === -1 ? text.length : dot;
	const placesFromEnd = end - index - 1;
	return 10 ** placesFromEnd;
}

/** Place value of a fractional digit: 10^-(position after the dot). */
function fractionStep(index: number, dot: number): number {
	const placeAfterDot = index - dot;
	return 10 ** -placeAfterDot;
}
