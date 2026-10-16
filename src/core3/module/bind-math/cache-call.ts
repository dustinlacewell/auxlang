/**
 * One math call site with its cache. Our math functions are pure, so a call
 * whose arguments equal the site's last ones returns the last result. With
 * the site's slots a0, a1 (last arguments) and r (last result), all
 * `__mc[slot]` (cache-names.ts), the call `f(A, B)` becomes, as text on the
 * call's own line:
 *
 *   (X = (A), X === a0 && B === a1 && (X !== 0 || 1 / X === 1 / a0) && ... ? r
 *     : (a0 = X, a1 = B, r = __math_f(+X, +B)))
 *
 * The helper takes each run-time argument as a number (`+X`), as `Math.f`
 * does: an out-of-range element read gives `undefined`, which `Math.f` and
 * WASM both see as NaN.
 *
 * Equality is bit-exact: `===` plus a sign test at zero, so +0 and -0 differ;
 * NaN never equals, so a NaN argument always computes. A literal argument is
 * the same at every call and is neither compared nor kept. A plain name is
 * compared as it is; any other argument is evaluated once into its temp `X`,
 * in argument order. When an argument assigns, every non-literal argument
 * takes a temp, so a name is never read after a later argument changed it.
 */

import type { AnyNode } from "acorn";
import type { TextEdit } from "../tick-build/text-edits";
import { walk } from "../front/parse/walk";
import { slotRef, tempName } from "./cache-names";
import { MATH_HELPER_PREFIX } from "./math-helpers";

export interface CachedCall {
	readonly edits: readonly TextEdit[];
	/** The temps the call uses; the caller declares them as locals of the function. */
	readonly temps: readonly string[];
	/** The cache slots the call uses, from the first slot it was given. */
	readonly slots: number;
}

/** Where a call sits: its site number in the function (names temps) and its first cache slot. */
export interface CallSite {
	readonly site: number;
	readonly slot: number;
}

/** `node` is the call (or `**` expression) spanning `args`, offsets into `text`. */
export function cacheCall(
	at: CallSite,
	fn: string,
	node: AnyNode,
	args: readonly AnyNode[],
	text: string,
): CachedCall {
	const assigns = args.some(assignsIn);
	const values = args.map((arg, j) => argValue(arg, j, at.site, text, assigns));
	const tail = cacheTail(at.slot, fn, values);
	const temps = values.flatMap((v, j) => (v.kind === "temp" ? [{ j, name: v.text }] : []));
	if (temps.length === 0)
		return {
			edits: [{ start: node.start, end: node.end, text: `(${tail.text})` }],
			temps: [],
			slots: tail.slots,
		};
	const edits: TextEdit[] = [];
	let from = node.start;
	let open = "(";
	for (const { j, name } of temps) {
		const arg = args[j] as AnyNode;
		edits.push({ start: from, end: arg.start, text: `${open}${name} = (` });
		from = arg.end;
		open = "), ";
	}
	edits.push({ start: from, end: node.end, text: `), ${tail.text})` });
	return { edits, temps: temps.map((t) => t.name), slots: tail.slots };
}

interface ArgValue {
	/** `literal`: constant, not compared. `name`: compared as written. `temp`: held in a temp. */
	readonly kind: "literal" | "name" | "temp";
	readonly text: string;
}

function argValue(arg: AnyNode, j: number, site: number, text: string, assigns: boolean): ArgValue {
	if (isConstant(arg)) return { kind: "literal", text: text.slice(arg.start, arg.end) };
	if (arg.type === "Identifier" && !assigns) return { kind: "name", text: arg.name };
	return { kind: "temp", text: tempName(site, j) };
}

/** `test ? r : (store, r = f(values))`: one slot per non-literal argument, then the result's. */
function cacheTail(
	first: number,
	fn: string,
	values: readonly ArgValue[],
): { text: string; slots: number } {
	const keyed = values
		.filter((v) => v.kind !== "literal")
		.map((v, n) => ({ value: v.text, last: slotRef(first + n) }));
	const r = slotRef(first + keyed.length);
	const test =
		keyed.length === 0
			? `${r} === ${r}`
			: [
					...keyed.map(({ value, last }) => `${value} === ${last}`),
					...keyed.map(({ value, last }) => `(${value} !== 0 || 1 / ${value} === 1 / ${last})`),
				].join(" && ");
	const stores = keyed.map(({ value, last }) => `${last} = ${value}`);
	const args = values.map((v) => (v.kind === "literal" ? v.text : `+${v.text}`));
	const call = `${r} = ${MATH_HELPER_PREFIX}${fn}(${args.join(", ")})`;
	return {
		text: `${test} ? ${r} : (${[...stores, call].join(", ")})`,
		slots: keyed.length + 1,
	};
}

/** A literal, or a signed number literal: the same value at every call. */
function isConstant(node: AnyNode): boolean {
	if (node.type === "Literal") return !("regex" in node && node.regex !== undefined);
	return (
		node.type === "UnaryExpression" &&
		(node.operator === "-" || node.operator === "+") &&
		node.argument.type === "Literal" &&
		typeof node.argument.value === "number"
	);
}

function assignsIn(node: AnyNode): boolean {
	let found = false;
	walk(node, (n) => {
		if (n.type === "AssignmentExpression" || n.type === "UpdateExpression") found = true;
	});
	return found;
}
