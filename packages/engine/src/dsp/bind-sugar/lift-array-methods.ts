/**
 * Lift `fill`/`set`/`copyWithin`/`forEach` on a typed array (MANIFESTO §5,
 * card step 5) to the index loops the tick subset already accepts, so no
 * method call (check-call.ts) ever reaches the checker. Each is a statement
 * on its own (`buf.fill(0)`, not `let x = buf.fill(0)` — the return value a
 * real call gives is never used in a tick, and keeping the lift to statement
 * position keeps every rewrite a loop with no value to thread back).
 *
 * `fill(value, start = 0, end = T.length)` → `for (let __sg_flN = start; __sg_flN
 * < end; __sg_flN++) T[__sg_flN] = value;`. Only the non-negative, in-range
 * form JS gives when `start`/`end` land inside `[0, length]` is lifted — a
 * negative or out-of-range `start`/`end` argument is JS's clamp-to-length
 * rule, not reproduced here.
 *
 * `set(src, offset = 0)` → `for (let __sg_stN = 0; __sg_stN < src.length;
 * __sg_stN++) T[__sg_stN + offset] = src[__sg_stN];` — a plain forward copy,
 * correct whenever `T` and `src` do not overlap (true for two distinct
 * fields; `T.set(T, ...)` is the no-op identity case). The loop's own bound
 * is `src.length`, so a `T` shorter than `src` writes out of range the same
 * way a direct out-of-range element write already does — proven in range or
 * not by the plan's existing index reasoning (int-range.ts), same as any
 * other indexed write.
 *
 * `copyWithin(target, start, end = T.length)` → a forward loop when the
 * ranges cannot overlap in the writing direction (`target <= start`, i.e.
 * copying toward the front), a backward loop otherwise — the same direction
 * rule `Array.prototype.copyWithin` uses so an overlapping copy reads each
 * source slot before it is overwritten.
 *
 * `forEach((v, i) => body)` → `for (let __sg_feN = 0; __sg_feN < T.length;
 * __sg_feN++) { const v = T[__sg_feN]; const i = __sg_feN; body }` — only an
 * inline arrow with 1 or 2 identifier parameters is lifted; anything else
 * (a named function, a destructured or defaulted parameter, a third `array`
 * parameter) is a loud error naming the fix.
 *
 * Every argument that is not a plain identifier or member path is hoisted
 * into its own `const` right before the loop, read once, same rule as
 * lift-destructuring's and lift-for-of's own hoist.
 */

import type { AnyNode, ArrowFunctionExpression, CallExpression, Identifier, MemberExpression } from "acorn";
import { type TextEdit, applyEdits } from "../tick-build/text-edits";
import { parseFunction } from "../front/parse/parse-function";
import { walk } from "../front/parse/walk";
import { tempName } from "./sugar-temps";

const METHODS = new Set(["fill", "set", "copyWithin", "forEach"]);

export function liftArrayMethods(src: string, what: string): string {
	const parsed = parseFunction(src, what);
	const edits: TextEdit[] = [];
	const site = { next: 0 };
	walk(parsed.node.body, (node, parent) => {
		if (node.type !== "CallExpression") return;
		const callee = node.callee;
		if (callee.type !== "MemberExpression" || callee.computed || callee.property.type !== "Identifier") return;
		const method = callee.property.name;
		if (!METHODS.has(method)) return;
		if (parent?.type !== "ExpressionStatement")
			throw new Error(`${what}: .${method}(...) is lifted only as its own statement, not as a value`);
		edits.push(statementEdit(node, method, parsed.expression, site, what));
	});
	if (edits.length === 0) return src;
	const local = edits.map((e) => ({ ...e, start: e.start - parsed.offset, end: e.end - parsed.offset }));
	return applyEdits(src, local);
}

function statementEdit(
	node: CallExpression,
	method: string,
	text: string,
	site: { next: number },
	what: string,
): TextEdit {
	const callee = node.callee as MemberExpression;
	const target = readOnce(callee.object, "tg", text, site);
	const args = node.arguments;
	const body =
		method === "fill"
			? fillLoop(target, args, text, site, what)
			: method === "set"
				? setLoop(target, args, text, site, what)
				: method === "copyWithin"
					? copyWithinLoop(target, args, text, site, what)
					: forEachLoop(target, args, text, site, what);
	return { start: node.start, end: node.end, text: `${target.hoist}${body}` };
}

interface Source {
	readonly hoist: string;
	readonly expr: string;
}

/** `expr`'s text, hoisted into its own `const` (read once) unless it is already cheap to repeat. */
function readOnce(expr: AnyNode, lift: string, text: string, site: { next: number }): Source {
	if (isPlainPath(expr)) return { hoist: "", expr: sliceOf(expr, text) };
	const name = tempName(lift, site.next++);
	return { hoist: `const ${name} = (${sliceOf(expr, text)}); `, expr: name };
}

function fillLoop(
	target: Source,
	args: readonly AnyNode[],
	text: string,
	site: { next: number },
	what: string,
): string {
	const value = readOnce(requireArg(args, 0, "fill", "value", what), "fv", text, site);
	const start = args[1] === undefined ? { hoist: "", expr: "0" } : readOnce(args[1], "fs", text, site);
	const end = args[2] === undefined ? { hoist: "", expr: `${target.expr}.length` } : readOnce(args[2], "fe", text, site);
	const i = tempName("fl", site.next++);
	return (
		`${value.hoist}${start.hoist}${end.hoist}` +
		`for (let ${i} = ${start.expr}; ${i} < ${end.expr}; ${i}++) ${target.expr}[${i}] = ${value.expr};`
	);
}

function setLoop(
	target: Source,
	args: readonly AnyNode[],
	text: string,
	site: { next: number },
	what: string,
): string {
	const src = readOnce(requireArg(args, 0, "set", "src", what), "ss", text, site);
	const offset = args[1] === undefined ? { hoist: "", expr: "0" } : readOnce(args[1], "so", text, site);
	const i = tempName("st", site.next++);
	return (
		`${src.hoist}${offset.hoist}` +
		`for (let ${i} = 0; ${i} < ${src.expr}.length; ${i}++) ${target.expr}[${i} + ${offset.expr}] = ${src.expr}[${i}];`
	);
}

/** A forward loop when the copy cannot overwrite a slot it has yet to read (`target <= start`), else backward, same direction rule as `Array.prototype.copyWithin`. */
function copyWithinLoop(
	target: Source,
	args: readonly AnyNode[],
	text: string,
	site: { next: number },
	what: string,
): string {
	const to = readOnce(requireArg(args, 0, "copyWithin", "target", what), "ct", text, site);
	const from = readOnce(requireArg(args, 1, "copyWithin", "start", what), "cs", text, site);
	const end = args[2] === undefined ? { hoist: "", expr: `${target.expr}.length` } : readOnce(args[2], "ce", text, site);
	const n = tempName("cn", site.next++);
	const i = tempName("ci", site.next++);
	const count = `${n} = (${end.expr}) - (${from.expr})`;
	const forward =
		`for (let ${i} = 0; ${i} < ${n}; ${i}++) ${target.expr}[(${to.expr}) + ${i}] = ${target.expr}[(${from.expr}) + ${i}];`;
	const backward =
		`for (let ${i} = ${n} - 1; ${i} >= 0; ${i}--) ${target.expr}[(${to.expr}) + ${i}] = ${target.expr}[(${from.expr}) + ${i}];`;
	return (
		`${to.hoist}${from.hoist}${end.hoist}` +
		`{ let ${n} = 0; ${count}; if ((${to.expr}) <= (${from.expr})) { ${forward} } else { ${backward} } }`
	);
}

function forEachLoop(
	target: Source,
	args: readonly AnyNode[],
	text: string,
	site: { next: number },
	what: string,
): string {
	const callback = requireArg(args, 0, "forEach", "callback", what);
	if (callback.type !== "ArrowFunctionExpression")
		throw new Error(`${what}: forEach's callback must be an inline arrow, (v, i) => ...`);
	const arrow = callback as ArrowFunctionExpression;
	if (arrow.params.length < 1 || arrow.params.length > 2 || arrow.params.some((p) => p.type !== "Identifier"))
		throw new Error(`${what}: forEach's callback takes 1 or 2 plain parameters, (v) => ... or (v, i) => ...`);
	const params = arrow.params as readonly Identifier[];
	const i = tempName("fe", site.next++);
	const valueDecl = `const ${params[0]!.name} = ${target.expr}[${i}];`;
	const indexDecl = params.length === 2 ? ` const ${params[1]!.name} = ${i};` : "";
	const callbackBody = sliceOf(arrow.body, text);
	const block = arrow.body.type === "BlockStatement" ? `{ ${valueDecl}${indexDecl} ${callbackBody.slice(1)}` : `{ ${valueDecl}${indexDecl} ${callbackBody}; }`;
	return `for (let ${i} = 0; ${i} < ${target.expr}.length; ${i}++) ${block}`;
}

function requireArg(args: readonly AnyNode[], index: number, method: string, name: string, what: string): AnyNode {
	const arg = args[index];
	if (arg === undefined) throw new Error(`${what}: ${method} needs its ${name} argument`);
	return arg;
}

function sliceOf(node: AnyNode, text: string): string {
	return text.slice(node.start, node.end);
}

/** An identifier, or a chain of plain/computed member accesses off one: reading it twice has no side effect. */
function isPlainPath(node: AnyNode): boolean {
	let cur: AnyNode = node;
	while (cur.type === "MemberExpression") {
		if (cur.optional) return false;
		cur = (cur as { object: AnyNode }).object;
	}
	return cur.type === "Identifier";
}
