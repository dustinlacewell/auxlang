/**
 * Bind a signal lambda's math: its auxlang math calls become cached calls of
 * the math helpers (rewrite-math.ts). The result is data (types.ts
 * `BoundLambda`); each engine builds what it runs from it. Each lambda
 * occurrence is bound on its own, so each keeps its own cache. A lambda that
 * uses no auxlang math keeps its text unchanged.
 */

import type { BoundLambda } from "../../types";
import { assertAuthorNames } from "../assert-author-names";
import { bindSugar } from "../bind-sugar/bind-sugar";
import { rewriteMath } from "./rewrite-math";

export function bindLambdaMath(src: string): BoundLambda {
	assertAuthorNames(src, "lambda");
	const sugared = bindSugar(src, "lambda");
	const { text, uses, slots } = rewriteMath(sugared, "lambda");
	if (uses.size === 0) return sugared === src ? { fn: src, math: [], slots: 0 } : { fn: sugared, math: [], slots: 0 };
	return { fn: text, math: [...uses].sort(), slots };
}
