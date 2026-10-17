/**
 * Lift `x **= y` to `x = x ** y` (MANIFESTO §5, card step 1): auxlang has no
 * `**=`, only `**` (bound to its pow helper by bind-math). A plain target
 * (an identifier, or a member whose index is a name or a literal) is safe to
 * read twice and rewrites in place. A member target whose index could have a
 * side effect (`a[i++] **= 2`) is read once: its index is hoisted into a
 * generated temp declared at the top of the function, and the rewrite reads
 * and writes through that temp.
 */

import type { AnyNode, AssignmentExpression, MemberExpression } from "acorn";
import { type TextEdit, applyEdits } from "../tick-build/text-edits";
import { parseFunction } from "../front/parse/parse-function";
import { walk } from "../front/parse/walk";
import { declareTemps, tempName } from "./sugar-temps";

export function liftExponentAssign(src: string, what: string): string {
	const parsed = parseFunction(src, what);
	const edits: TextEdit[] = [];
	const temps: string[] = [];
	let site = 0;
	walk(parsed.node.body, (node) => {
		if (node.type !== "AssignmentExpression" || node.operator !== "**=") return;
		const target = node.left as AnyNode;
		if (target.type === "MemberExpression" && target.computed && !isPureIndex(target)) {
			const temp = tempName("ix", site++);
			edits.push(hoist(target, node, temp, parsed.expression));
			temps.push(temp);
		} else {
			edits.push(direct(target, node, parsed.expression));
		}
	});
	if (edits.length === 0) return src;
	const all = temps.length === 0 ? edits : declareTemps(parsed.node, temps, edits, parsed.expression);
	const local = all.map((e) => ({ ...e, start: e.start - parsed.offset, end: e.end - parsed.offset }));
	return applyEdits(src, local);
}

/** A computed member's index is pure when it is a plain identifier or a literal: reading it twice has no side effect. */
function isPureIndex(target: MemberExpression): boolean {
	const index = target.property;
	return index.type === "Identifier" || index.type === "Literal";
}

function sliceOf(node: AnyNode, text: string): string {
	return text.slice(node.start, node.end);
}

/** A safe-to-repeat target: `x = x ** y`, written out in full. */
function direct(target: AnyNode, node: AssignmentExpression, text: string): TextEdit {
	const t = sliceOf(target, text);
	const rhs = sliceOf(node.right, text);
	return { start: node.start, end: node.end, text: `${t} = ${t} ** (${rhs})` };
}

/** `a[i++] **= 2` → hoist `i++` into a temp, then `a[temp] = a[temp] ** 2`. */
function hoist(target: MemberExpression, node: AssignmentExpression, temp: string, text: string): TextEdit {
	const object = sliceOf(target.object, text);
	const index = sliceOf(target.property, text);
	const rhs = sliceOf(node.right, text);
	const replacement = `(${temp} = (${index}), ${object}[${temp}] = ${object}[${temp}] ** (${rhs}))`;
	return { start: node.start, end: node.end, text: replacement };
}
