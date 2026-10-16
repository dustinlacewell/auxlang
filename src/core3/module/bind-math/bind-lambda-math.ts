/**
 * Bind a signal lambda's math: its auxlang math calls become cached calls of
 * the math helpers (rewrite-math.ts). The result is data (types.ts
 * `BoundLambda`); each engine builds what it runs from it. Each lambda
 * occurrence is bound on its own, so each keeps its own cache. A lambda that
 * uses no auxlang math keeps its text unchanged.
 */

import type { BoundLambda } from "../../types";
import { rewriteMath } from "./rewrite-math";

export function bindLambdaMath(src: string): BoundLambda {
	const { text, uses, slots } = rewriteMath(src, "lambda");
	if (uses.size === 0) return { fn: src, math: [], slots: 0 };
	return { fn: text, math: [...uses].sort(), slots };
}
