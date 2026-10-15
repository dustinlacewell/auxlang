/**
 * A range in the patch code: character offsets [start, end) into the source
 * the user wrote (MANIFESTO §10.1).
 */

export interface SourceRange {
	readonly start: number;
	readonly end: number;
}
