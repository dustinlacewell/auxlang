/**
 * Types for voice projection and polyphonic output.
 */

/**
 * How to project polyphonic patterns into mono voices.
 *
 * "duplicate" (current behavior):
 *   Non-stack notes are duplicated into each voice lane.
 *   voiceCount({a, b}) = 2, both voices get surrounding context.
 *
 * "isolate":
 *   Voice 0 = non-stack content with rests where stacks appear.
 *   Voices 1+ = one per stack child, rests elsewhere.
 *   voiceCount([c4 {e4, g4} e4]) = 3:
 *     Voice 0: [c4 ~ e4]
 *     Voice 1: [~ e4 ~]
 *     Voice 2: [~ g4 ~]
 */
export type ProjectionStrategy = "duplicate" | "isolate";

/** A single voice channel with its identity */
export interface VoiceChannel {
	readonly id: number;
	readonly value: number;
}

/** Polyphonic signal - array of voice channels */
export type PolySignal = VoiceChannel[];

/**
 * Per-sample output from sequencer.
 * Each output is a PolySignal with voice IDs.
 */
export interface SeqOutput {
	/** Frequency per voice */
	readonly cv: PolySignal;
	/** Gate per voice (0 or 1) */
	readonly gate: PolySignal;
	/** Trigger per voice (1 on onset, else 0) */
	readonly trig: PolySignal;
}
