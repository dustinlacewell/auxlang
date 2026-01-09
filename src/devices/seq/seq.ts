/**
 * Sequencer device using expression-based parser.
 *
 * Uses the Expr AST parser and evaluator for full nesting support.
 * Outputs PolySignal arrays: cv[], gate[], trig[] with voice IDs.
 *
 * Inputs:
 * - `clk`: Clock trigger signal (advances on rising edge)
 *
 * Outputs:
 * - `cv`: Frequency per voice
 * - `gate`: Gate per voice (80% duty cycle, or held for tied notes)
 * - `trig`: Trigger per voice (pulse on note onset)
 *
 * @example
 * ```javascript
 * let c = clock(120)
 * let s = seq("{c4,e4,g4}").clk(c.trig)  // 3-voice chord
 * ```
 */

import { device } from "../../descriptor/device";
import { inputs } from "../../descriptor/inputs";
import { parseExpr } from "./expr/parse";
import { clearProbDecisions, countBeats, createTraversalState, traverse } from "./expr/traverse";
import type { Expr } from "./expr/types";
import { voiceCount } from "./expr/types";

/**
 * Create a sequencer from a mini-notation pattern string.
 *
 * @param patternString - Mini-notation pattern like "c3 e3 g3" or "{c4,e4,g4}"
 * @returns A descriptor with `cv`, `gate`, and `trig` outputs
 */
export function seq(patternString: string) {
	// Parse at construction time
	const expr = parseExpr(patternString);

	// Pre-calculate metadata
	const voices = voiceCount(expr);
	const totalBeats = countBeats(expr);

	// Serialize AST and metadata for worklet transfer
	const exprJson = JSON.stringify(expr);
	const exprFn = new Function(`return ${exprJson}`) as () => Expr;
	const voicesFn = new Function(`return ${voices}`) as () => number;
	const totalBeatsFn = new Function(`return ${totalBeats}`) as () => number;

	return device({
		inputs: inputs({ clk: 0 }),
		config: {
			expr: exprFn,
			voices: voicesFn,
			totalBeats: totalBeatsFn,
		},
		outputs: ["cv", "gate", "trig"],
		defaultInput: "clk",
		defaultOutput: "cv",
		process(inp, cfg, state, sampleRate) {
			// Get AST and metadata from config
			const expr = cfg.expr();
			const voices = cfg.voices();
			const totalBeats = cfg.totalBeats();

			// Debug logging (throttled)
			const logCount = ((state.logCount as number) ?? 0) + 1;
			state.logCount = logCount;
			const shouldLog = logCount % 5000 === 1;

			// Handle empty pattern
			if (totalBeats === 0 || voices === 0) {
				return { cv: [], gate: [], trig: [] };
			}

			// Initialize traversal state if needed
			if (!state.traversalState) {
				state.traversalState = (globalThis as any).seqTraverse.createTraversalState();
			}
			const traversalState = state.traversalState;

			// Edge detection for trigger (extract first voice value from poly signal)
			const trigSig = inp.clk ?? [];
			const trigIn = trigSig.length > 0 ? (trigSig[0] as { value: number }).value : 0;
			const wasTrig = (state.wasTrig as number) ?? 0;
			const trigOn = trigIn > 0.5;
			const trigWasOn = wasTrig > 0.5;
			const risingEdge = trigOn && !trigWasOn;
			const isReset = trigIn < -0.5;

			// Beat tracking
			let beatIndex = (state.beatIndex as number) ?? -1;
			let cycleCount = (state.cycleCount as number) ?? 0;

			// Samples per beat (calculated from BPM via reset signal)
			let samplesPerBeat = (state.samplesPerBeat as number) ?? 0;
			let samplesSinceTrig = (state.samplesSinceTrig as number) ?? 0;

			// Handle reset signal
			if (isReset) {
				const bpm = -trigIn;
				samplesPerBeat = (60 / bpm) * sampleRate;
				samplesSinceTrig = 0;
				beatIndex = 0;
				cycleCount = 0;
				(globalThis as any).seqTraverse.clearProbDecisions(traversalState);
			}

			// On rising edge, advance beat
			if (risingEdge && !isReset) {
				samplesSinceTrig = 0;
				beatIndex++;
				if (beatIndex >= totalBeats) {
					beatIndex = 0;
					cycleCount++;
					(globalThis as any).seqTraverse.clearProbDecisions(traversalState);
				}
			} else if (!isReset) {
				samplesSinceTrig++;
			}

			// If we haven't received a reset yet, output zeros
			if (beatIndex < 0) {
				state.wasTrig = trigIn;
				state.beatIndex = beatIndex;
				const zeros: Array<{ id: number; value: number }> = [];
				for (let i = 0; i < voices; i++) {
					zeros.push({ id: i, value: 0 });
				}
				return { cv: zeros, gate: zeros, trig: zeros };
			}

			// Calculate phase within beat
			const phase = samplesPerBeat > 0
				? Math.min(samplesSinceTrig / samplesPerBeat, 0.999)
				: 0;

			if (shouldLog) {
				console.log("[seq]", JSON.stringify({
					beatIndex,
					phase: phase.toFixed(3),
					totalBeats,
					voices,
				}));
			}

			// Traverse AST to get output
			const output = (globalThis as any).seqTraverse.traverse(expr, {
				beatIndex,
				phase,
				cycle: cycleCount,
				totalBeats,
			}, traversalState);

			if (shouldLog) {
				console.log("[seq] output", JSON.stringify({
					cv: output.cv.map((v) => v.value.toFixed(0)),
					gate: output.gate.map((v) => v.value),
				}));
			}
			state.wasTrig = trigIn;
			state.beatIndex = beatIndex;
			state.cycleCount = cycleCount;
			state.samplesPerBeat = samplesPerBeat;
			state.samplesSinceTrig = samplesSinceTrig;

			return output;
		},
	});
}
