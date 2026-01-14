/**
 * Count the number of beats in an expression.
 */

import type { Expr } from "../ast/types";

/**
 * Count total beats for an expression.
 * Used for timing calculations during traversal.
 */
export function countBeats(expr: Expr): number {
	switch (expr.type) {
		case "note":
		case "rest":
		case "group":
		case "alt":
		case "stack":
		case "tie":
			return 1;
		case "seq":
			return expr.children.reduce((sum, child) => sum + countBeats(child), 0);
		case "multiply":
			return countBeats(expr.child);
		case "replicate":
			return countBeats(expr.child) * expr.count;
		case "elongate":
			return expr.count;
		case "euclidean":
			return 1;
		case "maybe":
			return countBeats(expr.child);
	}
}
