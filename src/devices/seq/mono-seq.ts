/**
 * Mono sequencer device - outputs plain numbers, not PolySignal.
 *
 * This is the building block for polyphonic sequences. The high-level
 * seq() function decomposes patterns and creates one monoSeq per voice,
 * wrapping in poly() when needed.
 */

import { device } from "../../descriptor/device";
import { inputs } from "../../descriptor/inputs";
import { countBeats } from "./expr/traverse";
import type { Expr } from "./expr/types";

/**
 * Internal mono seq device - not exported for direct use.
 * Use seq() which handles polyphony via decomposition.
 */
export function createMonoSeq(expr: Expr) {
	const totalBeats = countBeats(expr);

	// Serialize AST for worklet transfer
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

			// Handle empty pattern
			if (totalBeats === 0) {
				return { cv: 0, gate: 0, trig: 0 };
			}

			// Initialize traversal state (or reinitialize if corrupted by cloning)
			// Map objects become plain objects after clone, so check for working .clear()
			const ts = state.traversalState as {
				probDecisions?: { clear?: unknown };
				lastCV?: number;
				lastEventId?: string;
			} | undefined;
			if (!ts || typeof ts.probDecisions?.clear !== "function") {
				const fresh = (globalThis as any).seqTraverse.createMonoTraversalState();
				// Preserve lastCV and lastEventId from corrupted state to avoid false triggers
				if (ts) {
					fresh.lastCV = ts.lastCV ?? 0;
					fresh.lastEventId = ts.lastEventId ?? "";
				}
				state.traversalState = fresh;
			}
			const traversalState = state.traversalState;

			// Clock input: impulse (>0.5) or reset signal (<-0.5 encodes -BPM)
			const clk = typeof inp.clk === "number" ? inp.clk : 0;
			const isReset = clk < -0.5;
			const isTrig = clk > 0.5;

			// Beat tracking
			let beatIndex = (state.beatIndex as number) ?? -1;
			let cycleCount = (state.cycleCount as number) ?? 0;
			let samplesPerBeat = (state.samplesPerBeat as number) ?? 0;
			let samplesSinceTrig = (state.samplesSinceTrig as number) ?? 0;

			// Handle reset signal (first clock pulse, carries BPM)
			if (isReset) {
				const bpm = -clk;
				samplesPerBeat = (60 / bpm) * sampleRate;
				samplesSinceTrig = 0;
				beatIndex = 0;
				cycleCount = 0;
				(globalThis as any).seqTraverse.clearMonoProbDecisions(traversalState);
			}

			// On trigger impulse, advance beat
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

			// If we haven't received a reset yet, output zeros
			if (beatIndex < 0) {
				state.beatIndex = beatIndex;
				return { cv: 0, gate: 0, trig: 0 };
			}

			// Calculate phase within beat
			const phase = samplesPerBeat > 0 ? Math.min(samplesSinceTrig / samplesPerBeat, 0.999) : 0;

			// Traverse AST to get mono output
			const output = (globalThis as any).seqTraverse.traverseMono(
				expr,
				{
					beatIndex,
					phase,
					cycle: cycleCount,
					totalBeats,
				},
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
