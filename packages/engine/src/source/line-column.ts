/** A code offset as a 1-based line and column, the way an editor names a place. */

export interface LineColumn {
	readonly line: number;
	readonly column: number;
}

export function lineColumn(source: string, offset: number): LineColumn {
	const before = source.slice(0, Math.max(0, offset));
	const lineStart = before.lastIndexOf("\n") + 1;
	return { line: before.split("\n").length, column: before.length - lineStart + 1 };
}
