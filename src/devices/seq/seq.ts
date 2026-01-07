/**
 * Sequencer device - steps through a pattern on clock triggers.
 *
 * Parses mini-notation patterns and outputs CV (pitch) and gate signals.
 *
 * Inputs:
 * - `trig`: Clock trigger signal (advances on rising edge)
 * - `gateIn`: Clock gate signal (controls output gate duration)
 *
 * Outputs:
 * - `cv`: Frequency in Hz for the current step (sample-and-hold)
 * - `gate`: 1.0 when current step is a note and input gate is high, 0.0 otherwise
 *
 * Supported mini-notation:
 * - Notes: c3, c#4, db2
 * - Rests: ~
 * - Groups: [c3 e3] - subdivide within one beat
 * - Alternation: <c3 e3> - cycle through options each pattern loop
 * - Multiply: c3*2 - repeat within same beat
 * - Replicate: c3!2 - repeat as separate beats
 * - Elongate: c3@2 - sustain across multiple beats (tied)
 * - Euclidean: c3(3,8) - spread 3 hits over 8 beats
 *
 * @example
 * ```javascript
 * let c = clock(120)
 * let s = seq("c3 e3 g3").trig(c.trig).gateIn(c.gate)
 * let voice = osc(s.cv)
 * let shaped = gain(voice).amount(env(s.gate).out)
 * return out(shaped)
 * ```
 */

import { device } from "../../descriptor/device";
import { inputs } from "../../descriptor/inputs";
import { parse } from "./parse";
import type { Beat, Pattern, Step } from "./types";

/**
 * Create a sequencer from a mini-notation pattern string.
 *
 * @param patternString - Mini-notation pattern like "c3 e3 g3" or "c3 [e3 g3] ~"
 * @returns A descriptor with `cv` and `gate` outputs
 */
export function seq(patternString: string) {
	const pattern = parse(patternString);

	// Create a function whose toString() embeds the pattern data
	// This ensures the data survives serialization to the worklet
	const patternJson = JSON.stringify(pattern);
	const patternFn = new Function(`return ${patternJson}`) as () => Pattern;

	return device({
		inputs: inputs({ trig: 0, gateIn: 0 }),
		config: {
			pattern: patternFn,
		},
		outputs: ["cv", "gate"],
		defaultInput: "trig",
		defaultOutput: "cv",
		process(inp, cfg, state, sampleRate) {
			// Helper: check if a step should play on the current cycle (for alternation)
			const shouldPlay = (s: { cycle?: number; cycleTotal?: number }, cycle: number) =>
				s.cycle === undefined || s.cycleTotal === undefined
					? true
					: cycle % s.cycleTotal === s.cycle;

			// Helper: find step within a beat using phase (0-1)
			const findStepInBeat = (beat: Beat, phase: number, cycleCount: number): { step: Step; stepPhase: number } => {
				// Filter to playable steps for this cycle
				const playable = beat.filter(s => shouldPlay(s, cycleCount));
				if (playable.length === 0) {
					return { step: { type: "rest", dur: 1.0 }, stepPhase: 0 };
				}

				// Walk through steps to find which one contains this phase
				let accumulatedDur = 0;
				for (const step of playable) {
					if (accumulatedDur + step.dur > phase) {
						const stepPhase = (phase - accumulatedDur) / step.dur;
						return { step, stepPhase };
					}
					accumulatedDur += step.dur;
				}

				// Return last step if phase >= 1 (edge case)
				const lastStep = playable[playable.length - 1];
				return { step: lastStep ?? { type: "rest", dur: 1.0 }, stepPhase: 0.999 };
			};

			// Get pattern (cached in state after first call)
			const pat = (state.pat as Pattern) ?? cfg.pattern();
			state.pat = pat;

			// Handle empty pattern
			if (pat.length === 0) {
				return { cv: 0, gate: 0 };
			}

			// Edge detection for trigger
			const trig = inp.trig ?? 0;
			const gateIn = inp.gateIn ?? 0;
			const wasTrig = (state.wasTrig as number) ?? 0;
			const trigOn = trig > 0.5;
			const trigWasOn = wasTrig > 0.5;
			const risingEdge = trigOn && !trigWasOn;

			// Beat tracking (integer index)
			let beatIndex = (state.beatIndex as number) ?? 0;
			let cycleCount = (state.cycleCount as number) ?? 0;

			// Samples per beat (measured from trigger intervals)
			let samplesPerBeat = (state.samplesPerBeat as number) ?? sampleRate / 2; // default 120 BPM
			let samplesSinceTrig = (state.samplesSinceTrig as number) ?? 0;

			// On rising edge, advance beat and measure tempo
			if (risingEdge) {
				// Measure beat length if reasonable (at least 100 samples)
				if (samplesSinceTrig >= 100) {
					samplesPerBeat = samplesSinceTrig;
				}
				samplesSinceTrig = 0;

				// Advance to next beat
				beatIndex++;
				if (beatIndex >= pat.length) {
					beatIndex = 0;
					cycleCount++;
				}
			} else {
				samplesSinceTrig++;
			}

			// Calculate phase within beat (0 to ~1)
			const phase = Math.min(samplesSinceTrig / samplesPerBeat, 0.999);

			// Get current beat
			const beat = pat[beatIndex];
			if (!beat || beat.length === 0) {
				state.wasTrig = trig;
				state.beatIndex = beatIndex;
				state.cycleCount = cycleCount;
				state.samplesPerBeat = samplesPerBeat;
				state.samplesSinceTrig = samplesSinceTrig;
				return { cv: (state.cv as number) ?? 0, gate: 0 };
			}

			// Find step within beat using phase
			const { step, stepPhase } = findStepInBeat(beat, phase, cycleCount);

			// CV: update on note, hold on rest
			let cv = (state.cv as number) ?? 0;
			if (step.type === "note") {
				cv = step.freq;
			}

			// Gate logic
			let gateOut = 0;
			if (step.type === "note") {
				const isTied = step.tie === true;
				const isSubdivided = step.dur < 1;

				if (isSubdivided) {
					// Subdivided step: internal 80% duty cycle gate
					gateOut = stepPhase < 0.8 ? 1 : 0;
				} else if (isTied) {
					// Tied note: follow gateIn (sustain from previous beat)
					gateOut = gateIn > 0.5 ? 1 : 0;
				} else {
					// Normal note: follow gateIn
					gateOut = gateIn > 0.5 ? 1 : 0;
				}
			}

			// Update state
			state.wasTrig = trig;
			state.beatIndex = beatIndex;
			state.cycleCount = cycleCount;
			state.samplesPerBeat = samplesPerBeat;
			state.samplesSinceTrig = samplesSinceTrig;
			state.cv = cv;

			return { cv, gate: gateOut };
		},
	});
}
