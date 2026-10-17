/**
 * Lift `let x;` with no initializer (MANIFESTO §5, card step 10) to
 * `let x = 0;` when a definite-assignment check (assigned-before-read.ts)
 * finds `x` assigned on every path before any read of it, within the
 * statement list the declaration sits in — the same shape walk-statements.ts
 * (front/types/) already reads a backend's control flow with: an `if` needs
 * both branches, a switch needs every case and a `default`, a loop's body
 * may run zero times so nothing inside it counts, and a path that returns or
 * breaks out needs nothing after it.
 *
 * When some path may read `x` before assigning it, this throws, naming the
 * variable and the author's own line, phrased as what to write instead.
 */

import type { AnyNode } from "acorn";
import { parseFunction } from "../front/parse/parse-function";
import { eachChild } from "../front/parse/walk";
import { type TextEdit, applyEdits } from "../tick-build/text-edits";
import { assignedBeforeRead } from "./assigned-before-read";

export function liftLetNoValue(src: string, what: string): string {
	const parsed = parseFunction(src, what);
	const edits: TextEdit[] = [];
	visitLists(parsed.node.body, what, edits);
	if (edits.length === 0) return src;
	const local = edits.map((e) => ({ ...e, start: e.start - parsed.offset, end: e.end - parsed.offset }));
	return applyEdits(src, local);
}

/** Every statement list in the function (a block's body, each switch case's own statements), each checked against the siblings that follow it in that same list. */
function visitLists(node: AnyNode, what: string, edits: TextEdit[]): void {
	if (node.type === "BlockStatement") checkList(node.body, what, edits);
	else if (node.type === "SwitchStatement") for (const k of node.cases) checkList(k.consequent, what, edits);
	eachChild(node, (child) => visitLists(child, what, edits));
}

function checkList(list: readonly AnyNode[], what: string, edits: TextEdit[]): void {
	list.forEach((statement, index) => {
		if (statement.type !== "VariableDeclaration" || statement.kind !== "let") return;
		for (const d of statement.declarations) {
			if (d.id.type !== "Identifier" || d.init != null) continue;
			const name = d.id.name;
			const rest = list.slice(index + 1);
			if (!assignedBeforeRead(name, rest))
				throw new Error(
					`${what}: '${name}' may be read before it has a value — give it a starting value, e.g. \`let ${name} = 0\``,
				);
			edits.push({ start: d.start, end: d.end, text: `${name} = 0` });
		}
	});
}
