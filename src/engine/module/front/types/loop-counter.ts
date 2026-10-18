/**
 * A `for` loop counter that is always an int32: `for (let i = A; i < B; i++)`
 * and its kin (`<=`, `B > i`, `i += k`, and counting down with `>`/`>=` and
 * `--`/`-= k`), where A and B have integer ranges, the step k is a positive
 * integer constant, and only the update writes `i`. The body runs only
 * where the test held, so there `i` is between A and B; the update can take
 * it one step past B, which the counter's whole range covers. `i` is its
 * binding (scope/), so a shadowing `i` is another variable.
 *
 * `counterShape` reads the syntax; `counterRanges` decides from the types
 * the plan gave the start, the limit and the step.
 */

import type { AnyNode, Expression, ForStatement, Identifier } from "acorn";
import type { FunctionIR } from "@/engine/module/front/module/module-ir";
import { bindingDeclaredBy, bindingOf } from "@/engine/module/front/scope/binding";
import { refersTo } from "@/engine/module/front/scope/refers-to";
import { writtenWithin } from "@/engine/module/front/scope/writes";
import { type Range, fitsI32 } from "./int-range";

export interface CounterShape {
	readonly id: Identifier;
	readonly init: Expression;
	readonly op: string;
	readonly limit: AnyNode;
	/** The counter as an operand of the test and as the update's target. */
	readonly operands: readonly Identifier[];
	/** +1 or -1: the step's direction. */
	readonly sign: 1 | -1;
	/** The `k` of `+= k` / `-= k`; null for `++` / `--`. */
	readonly amount: AnyNode | null;
}

export interface CounterRanges {
	/** Every value the counter holds. */
	readonly range: Range;
	/** The values it holds in the body. */
	readonly body: Range;
}

type IsCounter = (node: AnyNode) => node is Identifier;

export function counterShape(ir: FunctionIR, node: ForStatement): CounterShape | null {
	const init = node.init;
	if (init?.type !== "VariableDeclaration" || init.kind !== "let" || init.declarations.length !== 1)
		return null;
	const d = init.declarations[0];
	if (d?.id.type !== "Identifier" || d.init === null || d.init === undefined) return null;
	const binding = bindingDeclaredBy(ir.scopes, d.id);
	if (binding === undefined) return null;
	const is: IsCounter = (n): n is Identifier =>
		n.type === "Identifier" && bindingOf(ir.scopes, n) === binding;
	const step = stepOf(node.update, is);
	const bound = boundOf(node.test, is);
	if (step === null || bound === null) return null;
	if (refersTo(ir.scopes, d.init, binding) || refersTo(ir.scopes, bound.limit, binding)) return null;
	if (writtenWithin(ir.writes, binding, bound.test) || writtenWithin(ir.writes, binding, node.body))
		return null;
	return {
		id: d.id,
		init: d.init,
		op: bound.op,
		limit: bound.limit,
		operands: [bound.operand, step.target],
		sign: step.sign,
		amount: step.amount,
	};
}

/** The counter's ranges for the start's, limit's and step size's (stepSize) types; null when it is not an int32 counter. */
export function counterRanges(
	shape: CounterShape,
	start: Range | null,
	limit: Range | null,
	size: number | null,
): CounterRanges | null {
	if (start === null || limit === null || size === null) return null;
	const ranges =
		shape.sign > 0
			? upward(start, limit, shape.op, size)
			: downward(start, limit, shape.op, -size);
	return ranges !== null && fitsI32(ranges.range) ? ranges : null;
}

/** A step size the counter can take: a positive integer constant. */
export function stepSize(amount: unknown): number | null {
	return typeof amount === "number" && Number.isSafeInteger(amount) && amount > 0 ? amount : null;
}

function upward(start: Range, limit: Range, op: string, step: number): CounterRanges | null {
	if (op !== "<" && op !== "<=") return null;
	const top = Math.max(start.lo, op === "<" ? limit.hi - 1 : limit.hi);
	return {
		range: { lo: start.lo, hi: Math.max(start.hi, top + step) },
		body: { lo: start.lo, hi: top },
	};
}

function downward(start: Range, limit: Range, op: string, step: number): CounterRanges | null {
	if (op !== ">" && op !== ">=") return null;
	const bottom = Math.min(start.hi, op === ">" ? limit.lo + 1 : limit.lo);
	return {
		range: { lo: Math.min(start.lo, bottom + step), hi: start.hi },
		body: { lo: bottom, hi: start.hi },
	};
}

type Step = { target: Identifier; sign: 1 | -1; amount: AnyNode | null };

/** The update: `++`/`--`, or `+= k`/`-= k` with `k` still to be known. */
function stepOf(update: AnyNode | null | undefined, is: IsCounter): Step | null {
	if (update?.type === "UpdateExpression")
		return is(update.argument)
			? { target: update.argument, sign: update.operator === "++" ? 1 : -1, amount: null }
			: null;
	if (update?.type !== "AssignmentExpression" || !is(update.left)) return null;
	if (update.operator === "+=") return { target: update.left, sign: 1, amount: update.right };
	return update.operator === "-=" ? { target: update.left, sign: -1, amount: update.right } : null;
}

const FLIP: Readonly<Record<string, string>> = { "<": ">", "<=": ">=", ">": "<", ">=": "<=" };

/** The test as `counter op limit`. */
function boundOf(
	test: AnyNode | null | undefined,
	is: IsCounter,
): { test: AnyNode; op: string; limit: AnyNode; operand: Identifier } | null {
	if (test?.type !== "BinaryExpression") return null;
	const flipped = FLIP[test.operator];
	if (flipped === undefined) return null;
	if (is(test.left)) return { test, op: test.operator, limit: test.right, operand: test.left };
	if (is(test.right)) return { test, op: flipped, limit: test.left, operand: test.right };
	return null;
}
