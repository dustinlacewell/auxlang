/**
 * A mini-notation error at a position in the notation text. The message names
 * the position as before; `pos` and `length` let a caller that knows where the
 * notation was written point at the exact code (MANIFESTO §10.1).
 */

export class NotationError extends Error {
	constructor(
		message: string,
		readonly pos: number,
		readonly length = 1,
	) {
		super(`mini-notation: ${message} (at position ${pos})`);
	}
}

export function notationError(message: string, pos: number, length = 1): NotationError {
	return new NotationError(message, pos, length);
}
