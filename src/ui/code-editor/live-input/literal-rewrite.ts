/**
 * The edit that replaces a numeric literal's text with a new value, kept in
 * the literal's own decimal shape (`formatLike`). Pure: takes the doc text
 * and the literal's character range, returns a change spec a CodeMirror
 * transaction can apply directly ({ from, to, insert }).
 */

import { formatLike } from "./format-like";
import type { SourceRange } from "@/core3/source/range";

export interface LiteralChange {
	readonly from: number;
	readonly to: number;
	readonly insert: string;
}

export function literalRewrite(docText: string, range: SourceRange, value: number): LiteralChange {
	const originalText = docText.slice(range.start, range.end);
	return { from: range.start, to: range.end, insert: formatLike(value, originalText) };
}
