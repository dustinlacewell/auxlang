/**
 * Expression-based sequencer device.
 *
 * Uses the new Expr AST parser and evaluator for full nesting support.
 * Outputs parallel arrays: cv[], gate[], trig[] indexed by voice ID.
 *
 * Inputs:
 * - `clk`: Clock trigger signal (advances on rising edge)
 *
 * Outputs:
 * - `cv`: Frequency array per voice [freq0, freq1, ...]
 * - `gate`: Gate array per voice [g0, g1, ...]
 * - `trig`: Trigger array per voice [t0, t1, ...] (pulse on note onset)
 *
 * @example
 * ```javascript
 * let c = clock(120)
 * let s = seqExpr("{c4,e4,g4}").clk(c.trig)  // 3-voice chord
 * // s.cv = [261.63, 329.63, 392.00]
 * // s.gate = [1, 1, 1]
 * ```
 */

import { device } from "../../descriptor/device";
import { inputs } from "../../descriptor/inputs";
import { evaluate } from "./expr/evaluate";
import { parseExpr } from "./expr/parse";
import { createQueryState, query } from "./expr/query";
import type { RuntimePattern, SeqOutput } from "./expr/types";

/**
 * Create an expression-based sequencer from a mini-notation pattern string.
 *
 * @param patternString - Mini-notation pattern like "c3 e3 g3" or "{c4,e4,g4}"
 * @returns A descriptor with `cv`, `gate`, and `trig` outputs (all arrays)
 */
export function seqExpr(patternString: string) {
	// Parse and evaluate at construction time
	const expr = parseExpr(patternString);
	const pattern = evaluate(expr);

	// Serialize pattern for worklet transfer
	const patternJson = JSON.stringify(pattern);
	const patternFn = new Function(`return ${patternJson}`) as () => RuntimePattern;

	return device({
		inputs: inputs({ clk: 0 }),
		config: {
			pattern: patternFn,
		},
		outputs: ["cv", "gate", "trig"],
		defaultInput: "clk",
		defaultOutput: "cv",
		process(inp, cfg, state, sampleRate) {
			// Recreate query helpers inside process (for worklet serialization)
			const createQueryStateInner = (voiceCount: number) => ({
				lastBeatIndex: -1,
				lastPhase: 0,
				cv: new Array(voiceCount).fill(0) as number[],
				gate: new Array(voiceCount).fill(0) as number[],
				probCache: new Map<string, boolean>(),
				lastEventId: new Array(voiceCount).fill(null) as (string | null)[],
			});

			const findActiveEvent = (
				events: Array<{
					voiceId: number;
					freq: number;
					beatStart: number;
					beatEnd: number;
					prob?: number;
					cycle?: number;
					cycleTotal?: number;
					tied?: boolean;
				}>,
				time: number,
				cycle: number,
			) => {
				for (const event of events) {
					if (time < event.beatStart || time >= event.beatEnd) continue;
					if (event.cycle !== undefined && event.cycleTotal !== undefined) {
						if (cycle % event.cycleTotal !== event.cycle) continue;
					}
					return event;
				}
				return null;
			};

			const getEventId = (
				event: { voiceId: number; beatStart: number },
				cycle: number,
			) => `${event.voiceId}:${event.beatStart}:${cycle}`;

			// Get pattern from config
			const pat = cfg.pattern();
			const { voiceCount, events, totalBeats } = pat;

			// Initialize query state if needed
			if (!state.queryState) {
				state.queryState = createQueryStateInner(voiceCount);
			}
			const qState = state.queryState as {
				lastBeatIndex: number;
				lastPhase: number;
				cv: number[];
				gate: number[];
				probCache: Map<string, boolean>;
				lastEventId: (string | null)[];
			};

			// Handle empty pattern
			if (totalBeats === 0 || voiceCount === 0) {
				return { cv: [], gate: [], trig: [] };
			}

			// Edge detection for clock (extract channel 0 from poly signal)
			const clkIn = (inp.clk ?? [0])[0] ?? 0;
			const wasClk = (state.wasClk as number) ?? 0;
			const clkOn = clkIn > 0.5;
			const clkWasOn = wasClk > 0.5;
			const risingEdge = clkOn && !clkWasOn;
			const isReset = clkIn < -0.5;

			// Beat tracking
			let beatIndex = (state.beatIndex as number) ?? -1;
			let cycleCount = (state.cycleCount as number) ?? 0;

			// Samples per beat (calculated from BPM via reset signal)
			let samplesPerBeat = (state.samplesPerBeat as number) ?? 0;
			let samplesSinceTrig = (state.samplesSinceTrig as number) ?? 0;

			// Handle reset signal
			if (isReset) {
				const bpm = -clkIn;
				samplesPerBeat = (60 / bpm) * sampleRate;
				samplesSinceTrig = 0;
				beatIndex = 0;
				cycleCount = 0;
				qState.probCache.clear();
			}

			// On rising edge, advance beat
			if (risingEdge && !isReset) {
				samplesSinceTrig = 0;
				beatIndex++;
				if (beatIndex >= totalBeats) {
					beatIndex = 0;
					cycleCount++;
					qState.probCache.clear(); // Clear prob cache on cycle
				}
			} else if (!isReset) {
				samplesSinceTrig++;
			}

			// If we haven't received a reset yet, output zeros
			if (beatIndex < 0) {
				state.wasClk = clkIn;
				state.beatIndex = beatIndex;
				const zeros = new Array(voiceCount).fill(0) as number[];
				return { cv: zeros, gate: zeros, trig: zeros };
			}

			// Calculate phase within beat
			const phase = samplesPerBeat > 0
				? Math.min(samplesSinceTrig / samplesPerBeat, 0.999)
				: 0;

			// Query pattern
			const wrappedBeat = beatIndex % totalBeats;
			const absoluteTime = wrappedBeat + phase;

			// Initialize output arrays
			const cv = [...qState.cv];
			const gate = new Array(voiceCount).fill(0) as number[];
			const trig = new Array(voiceCount).fill(0) as number[];

			// Find active event for each voice
			for (let voiceId = 0; voiceId < voiceCount; voiceId++) {
				const voiceEvents = events.filter(
					(e: { voiceId: number }) => e.voiceId === voiceId,
				);
				const activeEvent = findActiveEvent(voiceEvents, absoluteTime, cycleCount);

				if (activeEvent) {
					// Check probability
					const eventId = getEventId(activeEvent, cycleCount);
					let probPass = true;

					if (activeEvent.prob !== undefined) {
						if (!qState.probCache.has(eventId)) {
							probPass = Math.random() < activeEvent.prob;
							qState.probCache.set(eventId, probPass);
						} else {
							probPass = qState.probCache.get(eventId)!;
						}
					}

					if (probPass) {
						cv[voiceId] = activeEvent.freq;

						const eventDuration = activeEvent.beatEnd - activeEvent.beatStart;
						const timeInEvent = absoluteTime - activeEvent.beatStart;
						const eventPhase = timeInEvent / eventDuration;

						if (activeEvent.tied) {
							gate[voiceId] = 1;
						} else {
							gate[voiceId] = eventPhase < 0.8 ? 1 : 0;
						}

						const lastId = qState.lastEventId[voiceId];
						if (lastId !== eventId) {
							trig[voiceId] = 1;
							qState.lastEventId[voiceId] = eventId;
						}
					}
				} else {
					qState.lastEventId[voiceId] = null;
				}
			}

			// Update state
			qState.cv = cv;
			qState.gate = gate;
			state.wasClk = clkIn;
			state.beatIndex = beatIndex;
			state.cycleCount = cycleCount;
			state.samplesPerBeat = samplesPerBeat;
			state.samplesSinceTrig = samplesSinceTrig;

			return { cv, gate, trig };
		},
	});
}
