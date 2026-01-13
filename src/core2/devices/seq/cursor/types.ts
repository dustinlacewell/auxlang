/**
 * Types for cursor-based pattern stepping.
 *
 * The cursor maintains position in the pattern AST and only
 * recomputes on beat boundaries, not every sample.
 */

import type { Expr } from "../expr/types";

/**
 * A position in the pattern tree - path from root to current node.
 */
export interface CursorFrame {
	/** The expression at this level */
	expr: Expr;
	/** Child index for container types (seq, group, etc.) */
	childIndex: number;
	/** Beat offset where this frame starts */
	beatStart: number;
	/** Duration allocated to this frame (in beats) */
	duration: number;
	/** For probability caching */
	pathKey: string;
}

/**
 * Complete cursor state for a mono pattern.
 * Uses plain objects (not Map) for serialization across worklet boundary.
 */
export interface Cursor {
	/** Stack of frames from root to current leaf */
	path: CursorFrame[];
	/** Current beat index */
	beatIndex: number;
	/** Current pattern cycle (for alternation) */
	cycle: number;
	/** Cached output for current beat */
	cv: number;
	/** Cached gate state (1 = note playing) */
	gateOn: boolean;
	/** Duration of current note (fraction of beat, for gate timing) */
	noteDuration: number;
	/** Beat at which current note started (for trigger detection) */
	noteStartBeat: number;
	/** Probability decisions for this cycle (plain object for serialization) */
	probDecisions: Record<string, boolean>;
	/** Last CV for sample-and-hold */
	lastCV: number;
	/** Flattened events for current beat (sorted by start time) */
	events: BeatEvent[];
	/** Index of current event in events array */
	eventIndex: number;
	/** Sample index of last triggered event (for sample-perfect trigger detection) */
	lastTriggeredSample: number;
}

/**
 * A note event within a beat, with fractional timing.
 * Flattened from arbitrarily nested groups/subdivisions.
 */
export interface BeatEvent {
	/** Frequency to output */
	freq: number;
	/** Start position within beat (0-1) */
	start: number;
	/** End position within beat (0-1) */
	end: number;
	/** Whether this event should trigger (false for tied continuations) */
	isTrigger: boolean;
}

/**
 * Output from the cursor for a single sample.
 */
export interface CursorOutput {
	cv: number;
	gate: number;
	trig: number;
}
