/**
 * Strip optional chaining (MANIFESTO §5, card step 7): `a?.b`, `a?.[i]`,
 * `f?.()` become their plain form — a path through state, inputs, outputs
 * and helper records is never null, so the `?` buys nothing but costs a
 * branch. acorn wraps an optional access in a `ChainExpression`; the `?.`
 * itself is exactly the two characters right after the object/callee ends
 * (acorn requires it immediately there, past only whitespace/comments).
 */

import type { AnyNode } from "acorn";
import { type TextEdit, applyEdits } from "../tick-build/text-edits";
import { parseFunction } from "../front/parse/parse-function";
import { walk } from "../front/parse/walk";

export function liftOptionalChaining(src: string, what: string): string {
	const parsed = parseFunction(src, what);
	const edits: TextEdit[] = [];
	walk(parsed.node.body, (node) => {
		if (node.type !== "MemberExpression" && node.type !== "CallExpression") return;
		if (!node.optional) return;
		const before = node.type === "MemberExpression" ? node.object : node.callee;
		edits.push(markerEdit(before, parsed.expression));
	});
	if (edits.length === 0) return src;
	const local = edits.map((e) => ({ ...e, start: e.start - parsed.offset, end: e.end - parsed.offset }));
	return applyEdits(src, local);
}

/** The `?.` marker right after `before` ends: `a?.b` → remove the `?`, leaving `a.b`; `a?.[i]`/`f?.()` → remove `?.` entirely. */
function markerEdit(before: AnyNode, text: string): TextEdit {
	const at = text.indexOf("?.", before.end);
	const next = text[at + 2];
	const keepsDot = next !== "[" && next !== "(";
	return { start: at, end: at + (keepsDot ? 1 : 2), text: "" };
}
