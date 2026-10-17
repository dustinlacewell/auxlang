/**
 * Lift `for (const v of arr)` / `for (let v of arr)` (MANIFESTO §5, card step
 * 3) to an index loop over `arr`, which the tick subset already accepts:
 * `for (let __sg_iN = 0; __sg_iN < arr.length; __sg_iN++) { const v =
 * arr[__sg_iN]; ... }`. `break`/`continue` reach through an index loop the
 * same as a `for...of`, so they need no change. A plain identifier or member
 * path (`voices`, `s.voices`) is cheap to read twice (once for `.length`,
 * once per index) and is read in place; anything else is hoisted into a
 * `const` right before the loop, so it is evaluated once. A loop nested in
 * another's body lifts first, so its own index loop lands in the outer
 * loop's text. A destructuring head (`for (const {a} of ...)`) is already
 * plain by the time this runs: lift-destructuring (bind-sugar.ts runs it
 * first) replaces the pattern with a plain local and puts its fields' own
 * declarations at the top of the body.
 */

import type { AnyNode, ForOfStatement, VariableDeclaration } from "acorn";
import { parseFunction } from "../front/parse/parse-function";
import { eachChild } from "../front/parse/walk";

export function liftForOf(src: string, what: string): string {
	const parsed = parseFunction(src, what);
	const site = { next: 0 };
	const lowered = transform(parsed.node.body, parsed.expression, site, what);
	return lowered === parsed.expression.slice(parsed.node.body.start, parsed.node.body.end)
		? src
		: src.slice(0, parsed.node.body.start - parsed.offset) +
				lowered +
				src.slice(parsed.node.body.end - parsed.offset);
}

/** `node`'s own text, with every `for...of` within it (innermost first) lifted to an index loop. */
function transform(node: AnyNode, text: string, site: { next: number }, what: string): string {
	const edits: { start: number; end: number; text: string }[] = [];
	eachChild(node, function visit(child) {
		if (child.type === "ForOfStatement") edits.push({ start: child.start, end: child.end, text: loopText(child, text, site, what) });
		else eachChild(child, visit);
	});
	if (edits.length === 0) return text.slice(node.start, node.end);
	edits.sort((a, b) => b.start - a.start);
	let out = text.slice(node.start, node.end);
	const base = node.start;
	for (const e of edits) out = out.slice(0, e.start - base) + e.text + out.slice(e.end - base);
	return out;
}

function loopText(node: ForOfStatement, text: string, site: { next: number }, what: string): string {
	const left = node.left as VariableDeclaration;
	const declarator = left.declarations[0];
	if (declarator === undefined || declarator.id.type !== "Identifier")
		throw new Error(
			`${what}: for...of with a destructuring head reached lift-for-of unlowered — lift-destructuring should have run first`,
		);
	const name = declarator.id.name;
	const n = site.next++;
	const index = `__sg_i${n}`;
	const body = transform(node.body, text, site, what);
	const iterable = text.slice(node.right.start, node.right.end);
	const plain = isPlainPath(node.right);
	const arr = plain ? iterable : `__sg_it${n}`;
	const hoist = plain ? "" : `const ${arr} = (${iterable}); `;
	return (
		`{ ${hoist}for (let ${index} = 0; ${index} < ${arr}.length; ${index}++) ` +
		`{ ${left.kind} ${name} = ${arr}[${index}]; ${body} } }`
	);
}

/** An identifier, or a chain of plain/computed member accesses off one: reading it twice has no side effect. */
function isPlainPath(node: AnyNode): boolean {
	let cur: AnyNode = node;
	while (cur.type === "MemberExpression") {
		if (cur.optional) return false;
		cur = cur.object;
	}
	return cur.type === "Identifier";
}
