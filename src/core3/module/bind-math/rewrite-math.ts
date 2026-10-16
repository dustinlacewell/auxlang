/**
 * Bind one function's math to auxlang's (MANIFESTO §7): `Math.<fn>(...)` for
 * each function auxlang implements, and `a ** b` (pow), become a cached call
 * of its math helper (cache-call.ts). Exact host operations (`Math.floor`,
 * `Math.sqrt`, ...), constants and `Math.random` stay as written. Cache
 * slots are numbered from `firstSlot`; the call temps are declared at the top
 * of the function. Edits stay on their lines, so errors keep the source's
 * line numbers.
 */

import { type AnyNode, type BinaryExpression, type CallExpression, tokenizer } from "acorn";
import { AUX_MATH_FUNCTIONS } from "../../math/aux-math-functions";
import { type TextEdit, applyEdits } from "../tick-build/text-edits";
import { type FunctionNode, parseFunction } from "../front/parse/parse-function";
import { walk } from "../front/parse/walk";
import { assertNoLibraryNames } from "../library-names";
import { cacheCall } from "./cache-call";
import { assertNoCacheNames } from "./cache-names";

export interface MathRewrite {
	readonly text: string;
	/** The library functions the text now calls. */
	readonly uses: ReadonlySet<string>;
	/** The cache slots the text uses; the next function's slots start after them. */
	readonly slots: number;
}

export function rewriteMath(src: string, what: string, firstSlot = 0): MathRewrite {
	const parsed = parseFunction(src, what);
	const uses = new Set<string>();
	assertNoCacheNames(parsed.node, what);
	assertNoLibraryNames(parsed.node, what);
	if (declares(parsed.node, "Math")) return { text: src, uses, slots: 0 };
	const edits: TextEdit[] = [];
	const temps: string[] = [];
	let site = 0;
	let slot = firstSlot;
	walk(parsed.node.body, (node) => {
		const call = mathCall(node);
		if (call === null) return;
		uses.add(call.fn);
		const cached = cacheCall({ site: site++, slot }, call.fn, node, call.args, parsed.expression);
		slot += cached.slots;
		edits.push(...cached.edits);
		temps.push(...cached.temps);
	});
	const all =
		temps.length === 0 ? edits : declareTemps(parsed.node, temps, edits, parsed.expression);
	const local = all.map((e) => ({
		...e,
		start: e.start - parsed.offset,
		end: e.end - parsed.offset,
	}));
	return { text: applyEdits(src, local), uses, slots: slot - firstSlot };
}

/** `Math.sin(x)` → sin with `[x]`; `a ** b` → pow with `[a, b]`; anything else → null. */
function mathCall(node: AnyNode): { fn: string; args: readonly AnyNode[] } | null {
	if (node.type === "BinaryExpression" && node.operator === "**") return power(node);
	if (node.type === "CallExpression") return auxCall(node);
	return null;
}

function power(node: BinaryExpression): { fn: string; args: readonly AnyNode[] } {
	return { fn: "pow", args: [node.left, node.right] };
}

/** Only a well-formed call is bound; any other stays as written for the front end to refuse. */
function auxCall(node: CallExpression): { fn: string; args: readonly AnyNode[] } | null {
	const callee = node.callee;
	if (
		callee.type !== "MemberExpression" ||
		callee.computed ||
		callee.object.type !== "Identifier" ||
		callee.object.name !== "Math" ||
		callee.property.type !== "Identifier"
	)
		return null;
	const arity = AUX_MATH_FUNCTIONS.get(callee.property.name);
	if (arity === undefined || node.arguments.length !== arity) return null;
	if (node.arguments.some((a) => a.type === "SpreadElement")) return null;
	return { fn: callee.property.name, args: node.arguments };
}

/**
 * The temps as one `let` at the top of the body. An arrow's expression body
 * (parenthesised or not) becomes a block returning it. Same-offset insertions
 * land in reverse push order, so the opening goes last and the closing first.
 */
function declareTemps(
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
function arrowEnd(text: string, from: number, to: number): number {
	const head = text.slice(from, to);
	for (const token of tokenizer(head, { ecmaVersion: "latest" })) {
		if (token.type.label === "=>") return from + token.end;
	}
	throw new Error(`no => between offsets ${from} and ${to}`);
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
