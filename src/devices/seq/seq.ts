/**
 * Sequencer using expression-based parser with compile-time voice decomposition.
 *
 * Polyphonic patterns are decomposed into separate mono sequencers at parse time,
 * wrapped in a poly descriptor. This eliminates runtime PolySignal handling.
 *
 * @example
 * ```javascript
 * let c = clock(120)
 * // Mono pattern - returns single descriptor
 * let s = seq("c4 e4 g4").clk(c.trig)
 * // Poly pattern - returns poly descriptor wrapping 3 mono seqs
 * let chord = seq("{c4,e4,g4}").clk(c.trig)
 * ```
 */

import { poly } from "../../descriptor/poly";
import { parseExpr } from "./expr/parse";
import { decomposePattern, voiceCount } from "./expr/types";
import { createMonoSeq } from "./mono-seq";

/**
 * Create a sequencer from a mini-notation pattern string.
 *
 * For mono patterns (voiceCount = 1), returns a single mono seq descriptor.
 * For poly patterns (voiceCount > 1), decomposes into N mono seqs wrapped in poly().
 *
 * @param patternString - Mini-notation pattern like "c3 e3 g3" or "{c4,e4,g4}"
 * @param params - Optional params object (Uzu style) e.g. { clk: clock.trig }
 * @returns A descriptor (mono) or poly descriptor (poly) with cv, gate, trig outputs
 */
export function seq(patternString: string, params?: { clk?: unknown }) {
	const expr = parseExpr(patternString);
	const voices = voiceCount(expr);

	let result: ReturnType<typeof createMonoSeq> | ReturnType<typeof poly>;

	if (voices === 1) {
		// Mono - return single seq descriptor
		result = createMonoSeq(expr);
	} else {
		// Poly - decompose into N mono patterns, create mono seq for each
		const monoExprs = decomposePattern(expr);
		const monoSeqs = monoExprs.map((monoExpr) => createMonoSeq(monoExpr));
		result = poly(monoSeqs);
	}

	// Apply params if provided (Uzu style)
	if (params?.clk !== undefined) {
		// For mono, call .clk() directly; for poly, it propagates
		result = (result as any).clk(params.clk);
	}

	return result;
}
