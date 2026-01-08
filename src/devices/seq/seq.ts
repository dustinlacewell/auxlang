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
 * - Maybe: c3? - 50% chance to play (rolled per step occurrence)
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
			// Returns step index along with step for probability tracking
			const findStepInBeat = (
				steps: Step[],
				phase: number,
				cycleCount: number,
			): { step: Step; stepPhase: number; stepIdx: number } => {
				// Filter to playable steps for this cycle
				const playable = steps.filter(s => shouldPlay(s, cycleCount));
				if (playable.length === 0) {
					return { step: { type: "rest", dur: 1.0 }, stepPhase: 0, stepIdx: -1 };
				}

				// Walk through steps to find which one contains this phase
				let accumulatedDur = 0;
				for (let i = 0; i < playable.length; i++) {
					const step = playable[i]!;
					if (accumulatedDur + step.dur > phase) {
						const stepPhase = (phase - accumulatedDur) / step.dur;
						return { step, stepPhase, stepIdx: i };
					}
					accumulatedDur += step.dur;
				}

				// Return last step if phase >= 1 (edge case)
				const lastIdx = playable.length - 1;
				const lastStep = playable[lastIdx] ?? { type: "rest" as const, dur: 1.0 };
				return { step: lastStep, stepPhase: 0.999, stepIdx: lastIdx };
			};

			// Simple pattern hash for change detection
			const hashPattern = (p: Pattern): string => JSON.stringify(p);

			// Get pattern from config
			const configPat = cfg.pattern();
			const configPatHash = hashPattern(configPat);

			// Check if pattern changed (live re-eval)
			const currentPatHash = state.patHash as string | undefined;
			if (currentPatHash !== undefined && currentPatHash !== configPatHash) {
				// Pattern changed - queue for next beat
				state.pendingPat = configPat;
				state.pendingPatHash = configPatHash;
			}

			// Use current pattern (or initialize from config if first run)
			let pat = state.pat as Pattern | undefined;
			if (!pat) {
				pat = configPat;
				state.pat = pat;
				state.patHash = configPatHash;
			}

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
				// Apply pending pattern change on beat boundary
				if (state.pendingPat) {
					pat = state.pendingPat as Pattern;
					state.pat = pat;
					state.patHash = state.pendingPatHash;
					state.pendingPat = null;
					state.pendingPatHash = null;
				}

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

				// Reset step tracking for new beat
				state.lastStepIdx = -1;
				state.beatProbRolled = false;
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
			if (!beat || beat.steps.length === 0) {
				state.wasTrig = trig;
				state.beatIndex = beatIndex;
				state.cycleCount = cycleCount;
				state.samplesPerBeat = samplesPerBeat;
				state.samplesSinceTrig = samplesSinceTrig;
				state.gateActive = 0;
				return { cv: (state.cv as number) ?? 0, gate: 0 };
			}

			// Find step within beat using phase
			const { step, stepPhase, stepIdx } = findStepInBeat(beat.steps, phase, cycleCount);

			// Probability: beat-level prob rolls once per beat, step-level rolls per step
			let lastStepIdx = (state.lastStepIdx as number) ?? -1;
			let probPass = (state.probPass as boolean) ?? true;
			const beatProbRolled = (state.beatProbRolled as boolean) ?? false;

			if (beat.prob !== undefined) {
				// Beat-level probability (from [group]? or <alt>?)
				if (!beatProbRolled) {
					probPass = beat.prob >= 1 || Math.random() < beat.prob;
					state.beatProbRolled = true;
					state.probPass = probPass;
				}
				state.lastStepIdx = stepIdx;
			} else if (stepIdx !== lastStepIdx) {
				// Per-step probability
				const prob = step.prob;
				probPass = prob === undefined || prob >= 1 || Math.random() < prob;
				state.lastStepIdx = stepIdx;
				state.probPass = probPass;
			}

			// CV: only update when note actually plays (probPass true)
			// This prevents pitch discontinuities during skipped notes
			// For poly steps (chords), cv is an array of frequencies
			let cv = (state.cv as number | number[]) ?? 0;
			if (step.type === "note" && probPass) {
				// Output poly cv for chords, mono for single notes
				cv = step.freqs.length === 1 ? step.freqs[0] : step.freqs;
			}

			// Gate logic - sequencer generates its own gate
			// tieStart = this note connects to the next (hold gate high)
			// tie = this note receives from previous (don't re-trigger)
			// If probability check failed, gate is always off
			let gateOut = 0;
			if (step.type === "note" && probPass) {
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
