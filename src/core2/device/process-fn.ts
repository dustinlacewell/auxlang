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

export type ProcessFn = (
	inputs: Record<string, number>,
	config: Record<string, ConfigValue>,
	state: Record<string, unknown>,
	sampleRate: number,
	time: number,
	out: Record<string, number>,
) => void;

/**
 * Process function for polyphonic devices that handle all voices at runtime.
 * Receives arrays of values for each input, writes to pre-allocated output.
 */
export type ProcessAllFn = (
	inputs: Record<string, number[]>,
	config: Record<string, ConfigValue>,
	state: Record<string, unknown>,
	sampleRate: number,
	time: number,
	out: Record<string, number>,
) => void;
