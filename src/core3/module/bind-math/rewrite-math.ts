/**
 * Bind one function's math to auxlang's (MANIFESTO §7): `Math.<fn>(...)` for
 * each function auxlang implements becomes a call to its math helper, and
 * `a ** b` becomes `pow(a, b)`. Exact host operations (`Math.floor`,
 * `Math.sqrt`, ...), constants and `Math.random` stay as written. Edits stay
 * on their lines, so errors keep the source's line numbers.
 */

import { type BinaryExpression, type CallExpression, tokenizer } from "acorn";
import { AUX_MATH_FUNCTIONS } from "../../math/aux-math-functions";
import { type TextEdit, applyEdits } from "../tick-build/text-edits";
import { type FunctionNode, parseFunction } from "../tick-subset/parse-function";
import { walk } from "../tick-subset/walk";
import { MATH_HELPER_PREFIX } from "./math-helpers";

export interface MathRewrite {
	readonly text: string;
	/** The library functions the text now calls. */
	readonly uses: ReadonlySet<string>;
}

export function rewriteMath(src: string, what: string): MathRewrite {
	const parsed = parseFunction(src, what);
	const uses = new Set<string>();
	if (declares(parsed.node, "Math")) return { text: src, uses };
	const edits: TextEdit[] = [];
	walk(parsed.node.body, (node) => {
		if (node.type === "CallExpression") collectCall(node, edits, uses);
		else if (node.type === "BinaryExpression" && node.operator === "**")
			collectPower(node, parsed.expression, edits, uses);
	});
	const local = edits.map((e) => ({
		...e,
		start: e.start - parsed.offset,
		end: e.end - parsed.offset,
	}));
	return { text: applyEdits(src, local), uses };
}

/** `Math.sin(x)` → `__math_sin(x)`. */
function collectCall(node: CallExpression, edits: TextEdit[], uses: Set<string>): void {
	const callee = node.callee;
	if (
		callee.type !== "MemberExpression" ||
		callee.computed ||
		callee.object.type !== "Identifier" ||
		callee.object.name !== "Math" ||
		callee.property.type !== "Identifier" ||
		!AUX_MATH_FUNCTIONS.has(callee.property.name)
	)
		return;
	const name = callee.property.name;
	uses.add(name);
	edits.push({ start: callee.start, end: callee.end, text: MATH_HELPER_PREFIX + name });
}

/** `a ** b` → `__math_pow(a , b)`: open before, the operator becomes a comma, close after. */
function collectPower(
	node: BinaryExpression,
	text: string,
	edits: TextEdit[],
	uses: Set<string>,
): void {
	uses.add("pow");
	const operator = operatorIn(text, node.left.end, node.right.start);
	edits.push({ start: node.start, end: node.start, text: `${MATH_HELPER_PREFIX}pow(` });
	edits.push({ start: operator, end: operator + 2, text: "," });
	edits.push({ start: node.end, end: node.end, text: ")" });
}

/** The offset of the `**` token between two operands (past any parentheses and comments). */
function operatorIn(text: string, from: number, to: number): number {
	const gap = text.slice(from, to);
	for (const token of tokenizer(gap, { ecmaVersion: "latest" })) {
		if (gap.slice(token.start, token.end) === "**") return from + token.start;
	}
	throw new Error(`no ** operator between offsets ${from} and ${to}`);
}

/** Whether the function binds `name` itself (a parameter or local), shadowing the global. */
function declares(fn: FunctionNode, name: string): boolean {
	if (fn.params.some((p) => p.type === "Identifier" && p.name === name)) return true;
	let found = false;
	walk(fn.body, (node) => {
		if (
			node.type === "VariableDeclarator" &&
			node.id.type === "Identifier" &&
			node.id.name === name
		)
			found = true;
	});
	return found;
}
