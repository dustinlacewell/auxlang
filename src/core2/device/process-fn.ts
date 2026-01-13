/**
 * Runtime process function signature.
 *
 * Called per-sample to generate output values from input values.
 */

import type { ConfigValue } from "../signal/config-value";

export type ProcessFn = (
	inputs: Record<string, number>,
	config: Record<string, ConfigValue>,
	state: Record<string, unknown>,
	sampleRate: number,
	time: number,
) => Record<string, number>;
