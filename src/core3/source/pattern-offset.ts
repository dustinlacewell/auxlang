/**
 * Map a mini-notation position to a code offset. The notation tokenizer
 * counts positions over the template's text segments joined, with each
 * splice as one notional character (pattern/notation/tokenize), so segment k
 * starts at the summed lengths before it plus k.
 *
 * Null for a splice position, past the end, or inside a segment whose
 * written text differs from its parsed text.
 */

import type { PatternSite } from "./source-map";

export function patternOffset(site: PatternSite, pos: number): number | null {
	let base = 0;
	for (const segment of site.segments) {
		if (pos >= base && pos < base + segment.length) {
			return segment.code === null ? null : segment.code + (pos - base);
		}
		base += segment.length + 1;
	}
	return null;
}
