/**
 * Runtime process function signatures.
 *
 * ProcessFn: Called per-sample with scalar inputs.
 * ProcessAllFn: Called per-sample with array inputs (for polyphonic devices).
 */

import type { ConfigValue } from "../signal/config-value";

export type ProcessFn = (
	inputs: Record<string, number>,
	config: Record<string, ConfigValue>,
	state: Record<string, unknown>,
	sampleRate: number,
	time: number,
) => Record<string, number>;

/**
 * Process function for polyphonic devices that handle all voices at runtime.
 * Receives arrays of values for each input, returns scalar outputs.
 */
export type ProcessAllFn = (
	inputs: Record<string, number[]>,
	config: Record<string, ConfigValue>,
	state: Record<string, unknown>,
	sampleRate: number,
	time: number,
) => Record<string, number>;
