/**
 * Lift `s["n"]` to `s.n` (MANIFESTO §5, card step 6): a computed member whose
 * key is a string literal that reads as a valid identifier becomes the dot
 * form. A key that is not a valid identifier (`s["1a"]`, `s["a b"]`) is left
 * as written, so the front end's own check (check-member.ts) reports it.
 */

import type { MemberExpression } from "acorn";
import { type TextEdit, applyEdits } from "../tick-build/text-edits";
import { parseFunction } from "../front/parse/parse-function";
import { walk } from "../front/parse/walk";

const IDENTIFIER = /^[A-Za-z_$][A-Za-z0-9_$]*$/;

export function liftStringMember(src: string, what: string): string {
	const parsed = parseFunction(src, what);
	const edits: TextEdit[] = [];
	walk(parsed.node.body, (node) => {
		if (node.type !== "MemberExpression") return;
		const key = stringKey(node);
		if (key === null) return;
		edits.push({ start: node.object.end, end: node.end, text: `.${key}` });
	});
	if (edits.length === 0) return src;
	const local = edits.map((e) => ({ ...e, start: e.start - parsed.offset, end: e.end - parsed.offset }));
	return applyEdits(src, local);
}

/** The string key of a computed member, when it reads as a plain identifier. */
function stringKey(node: MemberExpression): string | null {
	if (!node.computed) return null;
	const key = node.property;
	if (key.type !== "Literal" || typeof key.value !== "string") return null;
	return IDENTIFIER.test(key.value) ? key.value : null;
}
