/**
 * Where a notation text was written in the patch code, as the parser needs
 * it: the site of each token, the code range of a position for errors, and
 * the literal behind each splice. Built from the location tables
 * (source/notation-source); the parser never sees the tables themselves.
 */

import type { SourceRange } from "../../source/range";

export interface NotationSplice {
	/** A number literal splice: its site. */
	readonly site?: number;
	/** A string literal splice: where its own notation text was written. */
	readonly text?: NotationSource;
}

export interface NotationSource {
	/** The site of the token at notation position `pos`, if it was written in the code. */
	tokenSite(pos: number): number | undefined;
	/** The code range of notation position `pos` (the whole pattern when unmappable). */
	range(pos: number, length: number): SourceRange;
	/** The literal behind the k-th splice. */
	splice(index: number): NotationSplice;
}
