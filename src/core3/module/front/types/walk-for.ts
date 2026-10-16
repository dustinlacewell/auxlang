/**
 * A `for` statement: init, test, body, update, as a backend emits them. A
 * loop that may have an int32 counter (loop-counter.ts) types its update
 * before its body, to know the step; the update's events still follow the
 * body's, in emission order. The counter then has its whole range at its
 * declaration, in the test and in the update, and its narrower body range
 * in the body.
 */

import type { AnyNode, ForStatement } from "acorn";
import { type Range, rangeOf } from "./int-range";
import { type CounterShape, counterRanges, counterShape, stepSize } from "./loop-counter";
import type { PlanContext } from "./plan-context";
import type { PlanEvent } from "./plan-events";
import { int } from "./ty";
import { typeExpr } from "./type-expression";
import { walkDeclaration } from "./walk-declaration";

export type WalkBody = (c: PlanContext, body: ForStatement["body"]) => void;

export function walkFor(c: PlanContext, node: ForStatement, walkBody: WalkBody): void {
	const shape = counterShape(c.ir, node);
	if (shape === null) {
		walkPlain(c, node, walkBody);
		return;
	}
	walkInitAndTest(c, node);
	const update = held(c, () => typeExpr(c, node.update as NonNullable<ForStatement["update"]>, "loose"));
	declareCounter(c, shape);
	walkBody(c, node.body);
	c.events.push(...update);
}

function walkPlain(c: PlanContext, node: ForStatement, walkBody: WalkBody): void {
	walkInitAndTest(c, node);
	walkBody(c, node.body);
	if (node.update) typeExpr(c, node.update, "loose");
}

function walkInitAndTest(c: PlanContext, node: ForStatement): void {
	if (node.init?.type === "VariableDeclaration") walkDeclaration(c, node.init);
	else if (node.init) typeExpr(c, node.init, "loose");
	if (node.test) typeExpr(c, node.test, "loose");
}

/** Runs `walk` and takes back the events it recorded. */
function held(c: PlanContext, walk: () => void): PlanEvent[] {
	const mark = c.events.length;
	walk();
	return c.events.splice(mark);
}

/** When the start, limit and step make an int32 counter, retypes it with its ranges. */
function declareCounter(c: PlanContext, shape: CounterShape): void {
	const ranges = counterRanges(
		shape,
		rangeOfNode(c, shape.init),
		rangeOfNode(c, shape.limit),
		shape.amount === null ? 1 : stepSizeOf(c, shape.amount),
	);
	if (ranges === null) return;
	const whole = int(ranges.range);
	c.types.set(shape.id, whole);
	for (const operand of shape.operands) c.types.set(operand, whole);
	c.narrow(shape.id, int(ranges.body));
}

function rangeOfNode(c: PlanContext, node: AnyNode): Range | null {
	const ty = c.types.get(node);
	return ty === undefined ? null : rangeOf(ty);
}

function stepSizeOf(c: PlanContext, amount: AnyNode): number | null {
	const ty = c.types.get(amount);
	return ty?.k === "static" ? stepSize(ty.v) : null;
}
