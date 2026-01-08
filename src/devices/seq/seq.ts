/**
 * Sequencer device - steps through a pattern on clock triggers.
 *
 * Parses mini-notation patterns and outputs CV (pitch) and gate signals.
 * The sequencer generates its own gate signal based on the pattern -
 * it does NOT require an external gate input.
 *
 * Inputs:
 * - `trig`: Clock trigger signal (advances on rising edge)
 *
 * Outputs:
 * - `cv`: Frequency in Hz for the current step (sample-and-hold)
 * - `gate`: 1.0 during notes, 0.0 during rests. Tied notes hold gate high.
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
 * let s = seq("c3 e3 g3").trig(c.trig)
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
		inputs: inputs({ trig: 0 }),
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

			// Edge detection for trigger (extract channel 0 from poly signal)
			const trig = (inp.trig ?? [0])[0] ?? 0;
			const wasTrig = (state.wasTrig as number) ?? 0;
			const trigOn = trig > 0.5;
			const trigWasOn = wasTrig > 0.5;
			const risingEdge = trigOn && !trigWasOn;
			const isReset = trig < -0.5; // Reset signal from clock (carries -bpm)

			// Beat tracking (integer index, starts at -1 meaning "waiting for first trigger")
			let beatIndex = (state.beatIndex as number) ?? -1;
			let cycleCount = (state.cycleCount as number) ?? 0;

			// Wrap beatIndex if pattern length changed (e.g., live re-eval with shorter pattern)
			if (beatIndex >= pat.length) {
				beatIndex = beatIndex % pat.length;
			}

			// Samples per beat (calculated from BPM or measured from trigger intervals)
			let samplesPerBeat = (state.samplesPerBeat as number) ?? 0;
			let samplesSinceTrig = (state.samplesSinceTrig as number) ?? 0;

			// Gate state: track if we're in an active note (for ties)
			let gateActive = (state.gateActive as number) ?? 0;

			// Handle reset signal (-bpm) from clock - this IS the first trigger
			if (isReset) {
				// Extract BPM from reset signal and calculate samplesPerBeat immediately
				const bpm = -trig; // trig is negative, so negate to get positive BPM
				samplesPerBeat = (60 / bpm) * sampleRate;
				samplesSinceTrig = 0;
				beatIndex = 0; // Start at beat 0 immediately
				cycleCount = 0;
				state.wasTrig = trig;
				state.beatIndex = beatIndex;
				state.cycleCount = cycleCount;
				state.samplesPerBeat = samplesPerBeat;
				state.samplesSinceTrig = samplesSinceTrig;
				// Don't return early - fall through to process beat 0
			}

			// On rising edge (not reset), advance beat and refine tempo
			if (risingEdge && !isReset) {
				// Refine tempo from actual trigger intervals (handles swing, drift)
				if (samplesPerBeat > 0 && samplesSinceTrig >= 100) {
					samplesPerBeat = samplesSinceTrig;
				}
				samplesSinceTrig = 0;

				// Advance to next beat
				beatIndex++;
				if (beatIndex >= pat.length) {
					beatIndex = 0;
					cycleCount++;
				}
			} else if (!isReset) {
				samplesSinceTrig++;
			}

			// If we haven't received a reset yet, output nothing
			if (beatIndex < 0) {
				state.wasTrig = trig;
				state.beatIndex = beatIndex;
				state.samplesSinceTrig = samplesSinceTrig;
				return { cv: 0, gate: 0 };
			}

			// Calculate phase within beat (0 to ~1)
			// Before tempo is known (samplesPerBeat == 0), stay at phase 0
			const phase = samplesPerBeat > 0
				? Math.min(samplesSinceTrig / samplesPerBeat, 0.999)
				: 0;

			// Get current beat
			const beat = pat[beatIndex];
			if (!beat || beat.length === 0) {
				state.wasTrig = trig;
				state.beatIndex = beatIndex;
				state.cycleCount = cycleCount;
				state.samplesPerBeat = samplesPerBeat;
				state.samplesSinceTrig = samplesSinceTrig;
				state.gateActive = 0;
				return { cv: (state.cv as number) ?? 0, gate: 0 };
			}

			// Find step within beat using phase
			const { step, stepPhase } = findStepInBeat(beat, phase, cycleCount);

			// CV: update on note, hold on rest
			// For poly steps (chords), cv is an array of frequencies
			let cv = (state.cv as number | number[]) ?? 0;
			if (step.type === "note") {
				// Output poly cv for chords, mono for single notes
				cv = step.freqs.length === 1 ? step.freqs[0] : step.freqs;
			}

			// Gate logic - sequencer generates its own gate
			// tieStart = this note connects to the next (hold gate high)
			// tie = this note receives from previous (don't re-trigger)
			let gateOut = 0;
			if (step.type === "note") {
				const isTieStart = step.tieStart === true;
				const isSubdivided = step.dur < 1;

				if (isSubdivided) {
					// Subdivided step: 80% duty cycle within the step
					gateOut = stepPhase < 0.8 ? 1 : 0;
				} else if (isTieStart) {
					// Start of tie chain: gate stays high for entire duration
					gateOut = 1;
				} else {
					// Normal note (or end of tie chain): 80% duty cycle
					gateOut = phase < 0.8 ? 1 : 0;
				}
			} else {
				// Rest: gate off
				gateOut = 0;
			}

			// Track gate state for tie handling
			gateActive = gateOut;

			// Update state
			state.wasTrig = trig;
			state.beatIndex = beatIndex;
			state.cycleCount = cycleCount;
			state.samplesPerBeat = samplesPerBeat;
			state.samplesSinceTrig = samplesSinceTrig;
			state.gateActive = gateActive;
			state.cv = cv;

			return { cv, gate: gateOut };
		},
	});
}
