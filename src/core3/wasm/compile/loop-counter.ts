/**
 * A `for` loop counter that is always an int32: `for (let i = A; i < B; i++)`
 * and its kin (`<=`, `B > i`, `i += k`, and counting down with `>`/`>=` and
 * `--`/`-= k`), where A and B have integer ranges (int-range-of.ts), the
 * step k is a positive integer constant, and only the update writes `i`.
 * The body runs only where the test held, so there `i` is between A and B;
 * the update can take it one step past B, which the counter's whole range
 * covers. Anything else is not a counter, and `i` stays an f64. `i` is its
 * binding (module/front/scope/), so a shadowing `i` is another variable.
 */

import type { AnyNode, Expression, ForStatement } from "acorn";
import { bindingDeclaredBy, bindingOf } from "../../module/front/scope/binding";
import { refersTo } from "../../module/front/scope/refers-to";
import { writtenWithin } from "../../module/front/scope/writes";
import type { FnEmitter } from "./fn-emitter";
import { type Range, fitsI32 } from "./int-range";
import { intRange } from "./int-range-of";
import { functionOf } from "./written";

type IsCounter = (node: AnyNode) => boolean;

export interface Counter {
	readonly name: string;
	readonly init: Expression;
	/** Every value the counter holds. */
	readonly range: Range;
	/** The values it holds in the body. */
	readonly body: Range;
}

export function counterOf(e: FnEmitter, node: ForStatement): Counter | null {
	const init = node.init;
	if (init?.type !== "VariableDeclaration" || init.kind !== "let" || init.declarations.length !== 1)
		return null;
	const d = init.declarations[0];
	if (d?.id.type !== "Identifier" || d.init === null || d.init === undefined) return null;
	const name = d.id.name;
	const fn = functionOf(e, node);
	const binding = bindingDeclaredBy(fn.scopes, d.id);
	if (binding === undefined) return null;
	const is: IsCounter = (n) => n.type === "Identifier" && bindingOf(fn.scopes, n) === binding;
	const step = stepOf(e, node.update, is);
	const bound = boundOf(node.test, is);
	if (step === null || bound === null) return null;
	if (refersTo(fn.scopes, d.init, binding) || refersTo(fn.scopes, bound.limit, binding))
		return null;
	if (writtenWithin(fn.writes, binding, bound.test) || writtenWithin(fn.writes, binding, node.body))
		return null;
	const start = intRange(e, d.init);
	const limit = intRange(e, bound.limit);
	if (start === null || limit === null) return null;
	const ranges =
		step > 0 ? upward(start, limit, bound.op, step) : downward(start, limit, bound.op, step);
	if (ranges === null || !fitsI32(ranges.range)) return null;
	return { name, init: d.init, ...ranges };
}

type Ranges = { range: Range; body: Range };

function upward(start: Range, limit: Range, op: string, step: number): Ranges | null {
	if (op !== "<" && op !== "<=") return null;
	const top = Math.max(start.lo, op === "<" ? limit.hi - 1 : limit.hi);
	return {
		range: { lo: start.lo, hi: Math.max(start.hi, top + step) },
		body: { lo: start.lo, hi: top },
	};
}

function downward(start: Range, limit: Range, op: string, step: number): Ranges | null {
	if (op !== ">" && op !== ">=") return null;
	const bottom = Math.min(start.hi, op === ">" ? limit.lo + 1 : limit.lo);
	return {
		range: { lo: Math.min(start.lo, bottom + step), hi: start.hi },
		body: { lo: bottom, hi: start.hi },
	};
}

/** The update's step: ±1 for `++`/`--`, ±k for `+= k`/`-= k`; null for anything else. */
function stepOf(e: FnEmitter, update: AnyNode | null | undefined, is: IsCounter): number | null {
	if (update?.type === "UpdateExpression")
		return is(update.argument) ? (update.operator === "++" ? 1 : -1) : null;
	if (update?.type !== "AssignmentExpression" || !is(update.left)) return null;
	const k = e.fold(update.right)?.v;
	if (typeof k !== "number" || !Number.isSafeInteger(k) || k <= 0) return null;
	if (update.operator === "+=") return k;
	return update.operator === "-=" ? -k : null;
}

const FLIP: Readonly<Record<string, string>> = { "<": ">", "<=": ">=", ">": "<", ">=": "<=" };

/** The test as `counter op limit`. */
function boundOf(
	test: AnyNode | null | undefined,
	is: IsCounter,
): { test: AnyNode; op: string; limit: AnyNode } | null {
	if (test?.type !== "BinaryExpression") return null;
	const flipped = FLIP[test.operator];
	if (flipped === undefined) return null;
	if (is(test.left)) return { test, op: test.operator, limit: test.right };
	if (is(test.right)) return { test, op: flipped, limit: test.left };
	return null;
}
