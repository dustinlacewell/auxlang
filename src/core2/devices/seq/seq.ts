/**
 * Sequencer using expression-based parser with compile-time voice decomposition.
 */

import { device } from "../../device/device";
import { inputs } from "../../device/inputs";
import { createNode } from "../../graph/create-node";
import { wrap } from "../../wrap/wrap";
import { parseExpr } from "./expr/parse";
import { countBeats } from "./expr/traverse";
import { decomposePattern, voiceCount, type Expr } from "./expr/types";

/**
 * Sequencer device with expand - creates mono or poly based on pattern.
 */
export const seq = device("seq", {
	inputs: inputs({ clk: 0 }),
	config: { pattern: "", expr: null, totalBeats: 0 },
	outputs: ["cv", "gate", "trig"],
	defaultInput: "clk",
	defaultOutput: "cv",
	positionalArgs: ["pattern", "clk"],
	process(inp, cfg, state, sampleRate) {
		const expr = cfg.expr as Expr | null;
		const totalBeats = cfg.totalBeats as number;

		if (!expr || totalBeats === 0) {
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
	expand(config, inputBindings) {
		const pattern = (config.pattern as string) ?? "";
		const clk = inputBindings.clk;

		if (!pattern) {
			return wrap(createNode("seq", { clk: clk ?? 0 }, { ...config, expr: null, totalBeats: 0 }));
		}

		const expr = parseExpr(pattern);
		const voices = voiceCount(expr);

		if (voices === 1) {
			const totalBeats = countBeats(expr);
			return wrap(createNode("seq", { clk: clk ?? 0 }, { ...config, expr, totalBeats }));
		}

		// Poly - decompose into N mono patterns, return array of nodes
		const monoExprs = decomposePattern(expr);
		return monoExprs.map((monoExpr) => {
			const totalBeats = countBeats(monoExpr);
			return wrap(createNode("seq", { clk: clk ?? 0 }, { ...config, expr: monoExpr, totalBeats }));
		});
	},
});
