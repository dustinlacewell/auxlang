/**
 * Splice edits into a function's text. Edits must not overlap, except that
 * an insertion (start === end) may sit at the start of a replacement: the
 * insertion then lands before the replacement's text. Edits stay on their
 * lines, so stack traces keep the source's line numbers.
 */

export interface TextEdit {
	readonly start: number;
	readonly end: number;
	readonly text: string;
}

/** Apply back to front so earlier offsets stay valid; at one start, the replacement goes first. */
export function applyEdits(text: string, edits: readonly TextEdit[]): string {
	let out = text;
	const order = [...edits].sort((a, b) => b.start - a.start || b.end - a.end);
	for (const edit of order) {
		out = out.slice(0, edit.start) + edit.text + out.slice(edit.end);
	}
	return out;
}
