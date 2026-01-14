/**
 * Decompose polyphonic patterns into mono voices.
 */

import type { Expr } from "../ast/types";
import type { ProjectionStrategy } from "./types";
import { voiceCount } from "./count";
import { projectVoice } from "./project";

/**
 * Decompose a polyphonic pattern into N mono patterns.
 *
 * @param expr - The expression to decompose
 * @param strategy - Projection strategy (default: "duplicate")
 * @returns Array of mono ASTs, one per voice
 */
export function decomposePattern(expr: Expr, strategy: ProjectionStrategy = "duplicate"): Expr[] {
	const count = voiceCount(expr, strategy);
	return Array.from({ length: count }, (_, i) => projectVoice(expr, i, strategy));
}
