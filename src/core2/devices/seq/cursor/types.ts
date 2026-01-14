/**
 * Types for cursor-based pattern stepping.
 *
 * The cursor maintains position in the pattern AST and only
 * recomputes on beat boundaries, not every sample.
 */

import type { Expr } from "../ast/types";
import type { AltState } from "../traverse/types";
import type { BeatEvent } from "../visitors/collect-events";

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
	/** Alt positions for nested alternations */
	altPositions: Record<string, AltState>;
	/** Last CV for sample-and-hold */
	lastCV: number;
	/** Flattened events for current beat (sorted by start time) */
	events: BeatEvent[];
	/** Index of current event in events array */
	eventIndex: number;
	/** Sample index of last triggered event (for sample-perfect trigger detection) */
	lastTriggeredSample: number;
}

// Re-export BeatEvent for convenience
export type { BeatEvent };

/**
 * Output from the cursor for a single sample.
 */
export interface CursorOutput {
	cv: number;
	gate: number;
	trig: number;
}
