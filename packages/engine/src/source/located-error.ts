/**
 * A loud failure that points at the code (MANIFESTO §6, §10.1). The error
 * keeps its message and type; it gains `sourceRange`, the code it names. The
 * innermost layer that knows a range sets it first, and later layers never
 * move it (a notation error's token beats the call it sits in).
 */

import type { SourceRange } from "./range";

interface Located {
	sourceRange?: SourceRange;
}

/** Point `err` at `range` unless it already points somewhere. Returns `err`. */
export function locateError<E>(err: E, range: SourceRange | undefined): E {
	if (range === undefined || !(err instanceof Error)) return err;
	const located = err as Located;
	if (located.sourceRange === undefined) located.sourceRange = range;
	return err;
}

/** The code range an error points at, if any. */
export function errorRange(err: unknown): SourceRange | undefined {
	return err instanceof Error ? (err as Located).sourceRange : undefined;
}
