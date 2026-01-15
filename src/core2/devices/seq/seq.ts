/**
 * Sequencer device using cursor-based pattern stepping.
 *
 * The cursor maintains position in the pattern and only recomputes
 * on beat changes, not every sample.
 */

import { device } from "../../device/device";
import { createNode } from "../../graph/create-node";
import { wrap } from "../../wrap/wrap";
import { parseExpr } from "./ast/parse";
import { countBeats } from "./traverse/count-beats";
import type { Expr } from "./ast/types";
import type { Cursor } from "./cursor/types";
import { voiceCount } from "./voices/count";
import { decomposePattern } from "./voices/decompose";
import { captureSeqPositionByPattern, captureSeqPositionByPatternForAll, getPatternStartPosition } from "../../eval/source-map";

export const seq = device("seq", {
	inputs: { clk: 0 },
	config: { pattern: "", expr: null, totalBeats: 0 },
	outputs: ["cv", "gate", "trig"],
	defaultInput: "clk",
	defaultOutput: "cv",
	positionalArgs: ["pattern", "clk"],

	process(inp, cfg, state, sampleRate, _time, out, ctx) {
		const expr = cfg.expr as Expr | null;
		const totalBeats = cfg.totalBeats as number;

		if (!expr || totalBeats === 0) {
			out.cv = 0;
			out.gate = 0;
			out.trig = 0;
			return;
		}

		// biome-ignore lint/suspicious/noExplicitAny: worklet global
		const api = (globalThis as any).seqCursor;

		// Initialize cursor if needed (on restore, cursor is already cloned from old state)
		let beatIndex = (state.beatIndex as number) ?? -1;
		let cycleCount = (state.cycleCount as number) ?? 0;

		if (!state.cursor) {
			state.cursor = api.createCursor(expr);
		}
		const cursor = state.cursor as Cursor;

		// Parse clock signal
		const clk = typeof inp.clk === "number" ? inp.clk : 0;
		const isReset = clk < -0.5;
		const isTrig = clk > 0.5;

		// Track timing state
		let samplesPerBeat = (state.samplesPerBeat as number) ?? 0;
		let samplesSinceTrig = (state.samplesSinceTrig as number) ?? 0;

		// Handle clock events
		let justReset = false;
		if (isReset) {
			const bpm = -clk;
			samplesPerBeat = (60 / bpm) * sampleRate;
			samplesSinceTrig = 0;
			beatIndex = 0;
			cycleCount = 0;
			justReset = true;
			api.resetCursor(cursor, expr);
		} else if (isTrig) {
			samplesSinceTrig = 0;
			beatIndex++;
			if (beatIndex >= totalBeats) {
				beatIndex = 0;
				cycleCount++;
			}
			api.stepCursor(cursor, expr, beatIndex, cycleCount);
		} else {
			samplesSinceTrig++;
		}

		// Before first beat, output silence
		if (beatIndex < 0) {
			state.beatIndex = beatIndex;
			out.cv = 0;
			out.gate = 0;
			out.trig = 0;
			return;
		}

		// Get output from cursor using sample index (O(1) - no tree traversal)
		const output = api.sampleCursor(cursor, samplesSinceTrig, samplesPerBeat);

		// Emit currently active element (if any)
		const patternStart = (cfg.patternStart as number) ?? 0;
		if (cursor.activeEventIndex >= 0) {
			const event = cursor.events[cursor.activeEventIndex];
			if (event?.srcStart !== undefined && event?.srcEnd !== undefined) {
				const absoluteId = `${patternStart + event.srcStart}:${patternStart + event.srcEnd}`;
				ctx.emitActiveElements([absoluteId]);
			}
		}

		// Update state
		state.beatIndex = beatIndex;
		state.cycleCount = cycleCount;
		state.samplesPerBeat = samplesPerBeat;
		state.samplesSinceTrig = samplesSinceTrig;

		out.cv = output.cv;
		out.gate = output.gate;
		out.trig = output.trig;
	},

	expand(config, inputBindings) {
		const pattern = (config.pattern as string) ?? "";
		const clk = inputBindings.clk;
		// Get pattern's document position for absolute element IDs
		const patternStart = getPatternStartPosition(pattern) ?? 0;

		if (!pattern) {
			const node = createNode("seq", { clk: clk ?? 0 }, { ...config, expr: null, totalBeats: 0, patternStart });
			captureSeqPositionByPattern(node.id, pattern);
			return wrap(node);
		}

		const expr = parseExpr(pattern);
		const voices = voiceCount(expr, "isolate");

		if (voices === 1) {
			const totalBeats = countBeats(expr);
			const node = createNode("seq", { clk: clk ?? 0 }, { ...config, expr, totalBeats, patternStart });
			captureSeqPositionByPattern(node.id, pattern);
			return wrap(node);
		}

		// Poly - decompose into N mono patterns
		// All voices map to the same source position
		const monoExprs = decomposePattern(expr, "isolate");
		const nodes = monoExprs.map((monoExpr) => {
			const totalBeats = countBeats(monoExpr);
			return createNode("seq", { clk: clk ?? 0 }, { ...config, expr: monoExpr, totalBeats, patternStart });
		});
		// Capture same position for all voice nodes using pattern lookup
		captureSeqPositionByPatternForAll(nodes.map(n => n.id), pattern);
		return nodes.map(node => wrap(node));
	},
});
