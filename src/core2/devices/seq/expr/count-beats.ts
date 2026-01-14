/**
 * Count total beats an expression occupies.
 */

import type { Expr } from "./types";

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
			return countBeats(expr.child) * expr.count;

		case "euclidean":
			return expr.steps;

		case "maybe":
			return countBeats(expr.child);
	}
}
