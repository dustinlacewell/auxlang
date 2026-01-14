/**
 * Voice counting for polyphonic patterns.
 */

import type { Expr } from "../ast/types";
import type { ProjectionStrategy } from "./types";

/**
 * Calculate voice count for an expression.
 *
 * Strategy affects counting:
 * - "duplicate": voiceCount = max stack depth (stacks sum children)
 * - "isolate": voiceCount = 1 + total stack children (base voice + stack lanes)
 */
export function voiceCount(expr: Expr, strategy: ProjectionStrategy = "duplicate"): number {
	return strategy === "duplicate" ? voiceCountDuplicate(expr) : voiceCountIsolate(expr);
}

/**
 * Duplicate strategy: stack children sum, containers take max.
 * Exported for use by project.ts.
 */
export function voiceCountDuplicate(expr: Expr): number {
	switch (expr.type) {
		case "stack":
			return expr.children.reduce((sum, child) => sum + voiceCountDuplicate(child), 0);

		// Sequences and groups: max voice count across children
		// (if one child is a 3-voice stack, the whole seq is 3 voices)
		case "seq":
		case "group":
		case "alt":
			return expr.children.reduce((max, child) => Math.max(max, voiceCountDuplicate(child)), 1);

		// Modifiers pass through to child
		case "multiply":
		case "replicate":
		case "elongate":
		case "euclidean":
		case "maybe":
			return voiceCountDuplicate(expr.child);

		// Tie uses first child's voice count (all must match)
		case "tie":
			return expr.children[0] ? voiceCountDuplicate(expr.children[0]) : 1;

		// Atoms (note, rest) = 1 voice
		default:
			return 1;
	}
}

/**
 * Isolate strategy: 1 base voice + count of stack leaf children.
 * A "stack leaf" is a stack child that is not itself a stack.
 */
function voiceCountIsolate(expr: Expr): number {
	return 1 + countStackLeaves(expr);
}

/**
 * Count stack leaf children - stack children that are not stacks themselves.
 * Nested stacks are transparent: {a, {b, c}} has 3 leaves (a, b, c).
 * Exported for use by project.ts.
 */
export function countStackLeaves(expr: Expr): number {
	switch (expr.type) {
		case "stack":
			return expr.children.reduce((sum, child) => {
				if (child.type === "stack") {
					// Nested stack is transparent - count its leaves
					return sum + countStackLeaves(child);
				}
				// Non-stack child = 1 leaf, plus any stacks nested inside it
				return sum + 1 + countStackLeaves(child);
			}, 0);

		case "seq":
		case "group":
		case "alt":
		case "tie":
			return expr.children.reduce((sum, child) => sum + countStackLeaves(child), 0);

		case "multiply":
		case "replicate":
		case "elongate":
		case "euclidean":
		case "maybe":
			return countStackLeaves(expr.child);

		// Atoms have no stack children
		default:
			return 0;
	}
}
