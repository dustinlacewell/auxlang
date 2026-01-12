/**
 * Sequencer using expression-based parser with compile-time voice decomposition.
 *
 * Polyphonic patterns are decomposed into separate mono sequencers at parse time,
 * wrapped in a poly descriptor. This eliminates runtime PolySignal handling.
 *
 * @example
 * ```javascript
 * // Chained from clock - clock fills clk, string fills pattern
 * clock(120).seq("c4 e4 g4")
 *
 * // Standalone with positional args
 * seq(clock(120), "c4 e4 g4")
 *
 * // Poly pattern - returns poly descriptor wrapping 3 mono seqs
 * clock(120).seq("{c4,e4,g4}")
 * ```
 */

import { device } from "../../descriptor/device";
import { inputs } from "../../descriptor/inputs";
import { poly } from "../../descriptor/poly";
import { parseExpr } from "./expr/parse";
import { countBeats } from "./expr/traverse";
import { decomposePattern, voiceCount, type Expr } from "./expr/types";

/**
 * Create a mono seq device for a specific expression AST.
 */
function createMonoSeqDevice(expr: Expr) {
	const totalBeats = countBeats(expr);
	const exprJson = JSON.stringify(expr);
	const exprFn = new Function(`return ${exprJson}`) as () => Expr;
	const totalBeatsFn = new Function(`return ${totalBeats}`) as () => number;

	return device({
		inputs: inputs({ clk: 0 }),
		config: {
			expr: exprFn,
			totalBeats: totalBeatsFn,
		},
		outputs: ["cv", "gate", "trig"],
		defaultInput: "clk",
		defaultOutput: "cv",
		process(inp, cfg, state, sampleRate) {
			const expr = cfg.expr();
			const totalBeats = cfg.totalBeats();

			if (totalBeats === 0) {
				return { cv: 0, gate: 0, trig: 0 };
			}

			const ts = state.traversalState as {
				probDecisions?: { clear?: unknown };
				lastCV?: number;
				lastEventId?: string;
			} | undefined;
			if (!ts || typeof ts.probDecisions?.clear !== "function") {
				const fresh = (globalThis as any).seqTraverse.createMonoTraversalState();
				if (ts) {
					fresh.lastCV = ts.lastCV ?? 0;
					fresh.lastEventId = ts.lastEventId ?? "";
				}
				state.traversalState = fresh;
			}
			const traversalState = state.traversalState;

			const clk = typeof inp.clk === "number" ? inp.clk : 0;
			const isReset = clk < -0.5;
			const isTrig = clk > 0.5;

			let beatIndex = (state.beatIndex as number) ?? -1;
			let cycleCount = (state.cycleCount as number) ?? 0;
			let samplesPerBeat = (state.samplesPerBeat as number) ?? 0;
			let samplesSinceTrig = (state.samplesSinceTrig as number) ?? 0;

			if (isReset) {
				const bpm = -clk;
				samplesPerBeat = (60 / bpm) * sampleRate;
				samplesSinceTrig = 0;
				beatIndex = 0;
				cycleCount = 0;
				(globalThis as any).seqTraverse.clearMonoProbDecisions(traversalState);
			}

			if (isTrig) {
				samplesSinceTrig = 0;
				beatIndex++;
				if (beatIndex >= totalBeats) {
					beatIndex = 0;
					cycleCount++;
					(globalThis as any).seqTraverse.clearMonoProbDecisions(traversalState);
				}
			} else if (!isReset) {
				samplesSinceTrig++;
			}

			if (beatIndex < 0) {
				state.beatIndex = beatIndex;
				return { cv: 0, gate: 0, trig: 0 };
			}

			const phase = samplesPerBeat > 0 ? Math.min(samplesSinceTrig / samplesPerBeat, 0.999) : 0;

			const output = (globalThis as any).seqTraverse.traverseMono(
				expr,
				{ beatIndex, phase, cycle: cycleCount, totalBeats },
				traversalState,
			);

			state.beatIndex = beatIndex;
			state.cycleCount = cycleCount;
			state.samplesPerBeat = samplesPerBeat;
			state.samplesSinceTrig = samplesSinceTrig;

			return output;
		},
	});
}

/**
 * Sequencer device with expand - creates mono or poly based on pattern.
 */
export const seq = device("seq", {
	inputs: inputs({ clk: 0 }),
	config: { pattern: "" },
	outputs: ["cv", "gate", "trig"],
	defaultInput: "clk",
	defaultOutput: "cv",
	positionalArgs: ["pattern", "clk"],
	expand(config, inputBindings) {
		const pattern = (config.pattern as string) ?? "";
		const clk = inputBindings.clk;

		if (!pattern) {
			// Empty pattern - return a silent mono seq
			const result = createMonoSeqDevice({ type: "seq", children: [] });
			// Wire up the clk input if provided
			return clk !== undefined ? result(clk) : result;
		}

		const expr = parseExpr(pattern);
		const voices = voiceCount(expr);

		if (voices === 1) {
			const result = createMonoSeqDevice(expr);
			// Wire up the clk input if provided
			return clk !== undefined ? result(clk) : result;
		}

		// Poly - decompose into N mono patterns
		const monoExprs = decomposePattern(expr);
		const monoSeqs = monoExprs.map((monoExpr) => {
			const monoSeq = createMonoSeqDevice(monoExpr);
			// Wire up the clk input to each voice if provided
			return clk !== undefined ? monoSeq(clk) : monoSeq;
		});
		return poly(monoSeqs);
	},
});
