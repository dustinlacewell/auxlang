/**
 * Runtime process function signatures.
 *
 * ProcessFn: Called per-sample with scalar inputs. Writes to pre-allocated output.
 * ProcessAllFn: Called per-sample with array inputs (for polyphonic devices).
 *
 * PERFORMANCE: Functions write to `out` instead of returning objects to avoid
 * allocations in the hot path (44100+ calls/second per node).
 */

import type { ConfigValue } from "../signal/config-value";

/**
 * Maps input defaults to their scalar runtime types.
 * number | number[] defaults both become number at runtime.
 */
export type InputsToScalar<T extends Record<string, number | number[]>> = {
	[K in keyof T]: number;
};

/**
 * Maps input defaults to their array runtime types (for processAll).
 */
export type InputsToArray<T extends Record<string, number | number[]>> = {
	[K in keyof T]: number[];
};

/**
 * Decoration to be applied in the editor.
 * Uses noteId for stable targeting that persists through code edits.
 */
export interface Decoration {
	noteId: string;
	start: number;
	end: number;
}

/**
 * Context provided to process functions for non-audio operations.
 */
export interface ProcessContext {
	/**
	 * Emit decorations for this node's source code.
	 * Only call when state changes (e.g., beat boundaries), not every sample.
	 * 
	 * @param decorations - Array of character ranges to highlight
	 */
	emitDecorations(decorations: Decoration[]): void;
}

/**
 * Typed process function - receives inputs matching the device's input definition.
 */
export type TypedProcessFn<I extends Record<string, number | number[]>> = (
	inputs: InputsToScalar<I>,
	config: Record<string, ConfigValue>,
	state: Record<string, unknown>,
	sampleRate: number,
	time: number,
	out: Record<string, number>,
	ctx: ProcessContext,
) => void;

/**
 * Typed processAll function for polyphonic devices.
 */
export type TypedProcessAllFn<I extends Record<string, number | number[]>> = (
	inputs: InputsToArray<I>,
	config: Record<string, ConfigValue>,
	state: Record<string, unknown>,
	sampleRate: number,
	time: number,
	out: Record<string, number>,
	ctx: ProcessContext,
) => void;

/**
 * Untyped process function - for runtime use where input keys aren't known statically.
 */
export type ProcessFn = TypedProcessFn<Record<string, number>>;

/**
 * Untyped processAll function - for runtime use.
 */
export type ProcessAllFn = TypedProcessAllFn<Record<string, number>>;
