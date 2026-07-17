/**
 * Sequencer device using phase-based event lookup.
 *
 * Takes a continuous phase input (from clock) and outputs cv/gate/trig
 * based on the current position within the pattern.
 */

import { device } from "../../device/device";
import { createNode } from "../../graph/create-node";
import { wrap } from "../../wrap/wrap";
import { parseExpr } from "./ast/parse";
import { countBeats } from "./traverse/count-beats";
import type { Expr } from "./ast/types";
import type { SeqEvent } from "./events/types";
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

	process(inp, cfg, state, _sampleRate, _time, out, ctx) {
		const expr = cfg.expr as Expr | null;
		const totalBeats = cfg.totalBeats as number;

		if (!expr || totalBeats === 0) {
			out.cv = 0;
			out.gate = 0;
			out.trig = 0;
			return;
		}

		// biome-ignore lint/suspicious/noExplicitAny: worklet global
		const api = (globalThis as any).seqPhase;

		// Get phase input (continuous ramp from clock)
		const phase = typeof inp.clk === "number" ? inp.clk : 0;

		// Calculate cycle from phase
		const cycle = Math.floor(phase / totalBeats);
		const lastCycle = (state.lastCycle as number) ?? -1;

		// Rebuild events when cycle changes (for alternation/probability)
		let events = state.events as SeqEvent[] | undefined;
		if (!events || cycle !== lastCycle) {
			events = api.buildEvents(expr, cycle);
			state.events = events;
			state.lastCycle = cycle;
		}

		// Lookup current event by phase position
		const position = phase % totalBeats;
		const eventIndex = api.lookupEventIndex(events, position);
		const event = eventIndex >= 0 && events ? events[eventIndex] : null;

		// Track last event for trigger detection
		const lastEventIndex = (state.lastEventIndex as number) ?? -1;
		const lastCV = (state.lastCV as number) ?? 0;

		// Output CV
		const cv = event && !event.isRest ? event.freq : lastCV;

		// Output gate (on unless rest, with gap for non-tied notes)
		let gate = 0;
		if (event && !event.isRest) {
			// Small gap before end for envelope retrigger (unless tied to next)
			const gapSize = 0.02; // 2% of note duration
			const noteLength = event.end - event.start;
			const gapStart = event.end - noteLength * gapSize;
			gate = event.isTiedToNext || position < gapStart ? 1 : 0;
		}

		// Output trigger (fires when entering a new non-tied note)
		let trig = 0;
		if (event && !event.isRest && eventIndex !== lastEventIndex && !event.isTiedFromPrevious) {
			trig = 1;
		}

		// Emit active element for visualization
		const patternStart = (cfg.patternStart as number) ?? 0;
		if (event && event.srcStart !== undefined && event.srcEnd !== undefined) {
			const absoluteId = `${patternStart + event.srcStart}:${patternStart + event.srcEnd}`;
			ctx.emitActiveElements([absoluteId]);
		}

		// Update state
		state.lastEventIndex = eventIndex;
		state.lastCV = cv;

		out.cv = cv;
		out.gate = gate;
		out.trig = trig;
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
