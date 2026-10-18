/**
 * Generated locals a lift hoists into (lift-exponent-assign.ts): named under
 * the reserved `__sg_` prefix (library-names.ts) so they can never collide
 * with an author's name, and declared as one `let` at the top of the
 * function, same as bind-math's call-cache temps (rewrite-math.ts).
 */

import type { TextEdit } from "../tick-build/text-edits";
import type { FunctionNode } from "../front/parse/parse-function";
import { tokenizer } from "acorn";

/** A temp name for one site of one lift, under the reserved `__sg_` prefix. */
export function tempName(lift: string, site: number): string {
	return `__sg_${lift}${site}`;
}

/**
 * The temps as one `let` at the top of the body. An arrow's expression body
 * (parenthesised or not) becomes a block returning it. Same-offset insertions
 * land in reverse push order, so the opening goes last and the closing first.
 */
export function declareTemps(
	fn: FunctionNode,
	temps: readonly string[],
	edits: readonly TextEdit[],
	text: string,
): TextEdit[] {
	const declaration = `let ${temps.map((t) => `${t} = 0`).join(", ")};`;
	const body = fn.body;
	if (body.type === "BlockStatement")
		return [...edits, { start: body.start + 1, end: body.start + 1, text: ` ${declaration}` }];
	const arrow = arrowEnd(text, fn.start, body.start);
	return [
		{ start: fn.end, end: fn.end, text: "); }" },
		...edits,
		{ start: arrow, end: arrow, text: ` { ${declaration} return (` },
	];
}

/** The offset just past an arrow function's `=>`. */
export function arrowEnd(text: string, from: number, to: number): number {
	const head = text.slice(from, to);
	for (const token of tokenizer(head, { ecmaVersion: "latest" })) {
		if (token.type.label === "=>") return from + token.end;
	}
	throw new Error(`no => between offsets ${from} and ${to}`);
}
