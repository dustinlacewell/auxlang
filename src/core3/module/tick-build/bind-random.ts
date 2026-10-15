/**
 * Route a tick's randomness through its state. `Math.random()` becomes a draw
 * from the lane's stream (`state.__rng`); `hashRandom(key)` gets the patch
 * seed (`state.__seed`) as its second argument. Edits stay on their lines, so
 * runtime stack traces keep the source's line numbers.
 */

import type { AnyNode, CallExpression } from "acorn";
import type { ParsedFunction } from "../tick-subset/parse-function";
import { walk } from "../tick-subset/walk";
import { type TextEdit, applyEdits } from "./text-edits";

/** The bound name of the stream draw (random/next-random.ts) inside a built tick. */
export const RANDOM_DRAW = "__auxRandom";

export function bindRandom(tick: ParsedFunction): string {
	const first = tick.node.params[0];
	if (first === undefined || first.type !== "Identifier") return tick.expression;
	const edits: TextEdit[] = [];
	walk(tick.node.body, (node) => {
		if (node.type === "CallExpression") collectEdit(node, first.name, edits);
	});
	return applyEdits(tick.expression, edits);
}

function collectEdit(call: CallExpression, state: string, edits: TextEdit[]): void {
	if (isMathRandom(call.callee) && call.arguments.length === 0) {
		edits.push({ start: call.start, end: call.end, text: `${RANDOM_DRAW}(${state})` });
		return;
	}
	const key = call.arguments[0];
	if (call.callee.type === "Identifier" && call.callee.name === "hashRandom" && key !== undefined) {
		// An insertion after the key, so a draw inside the key is still rewritten.
		edits.push({ start: key.end, end: key.end, text: `, ${state}.__seed` });
	}
}

function isMathRandom(callee: AnyNode): boolean {
	return (
		callee.type === "MemberExpression" &&
		!callee.computed &&
		callee.object.type === "Identifier" &&
		callee.object.name === "Math" &&
		callee.property.type === "Identifier" &&
		callee.property.name === "random"
	);
}
