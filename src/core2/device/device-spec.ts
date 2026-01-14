/**
 * Device specification - the blueprint for a device type.
 */

import type { ConfigValue } from "../signal/config-value";
import type { NodeInput } from "../signal/node-input";
import type { WrappedNode } from "../wrap/wrap";
import type { ProcessAllFn, ProcessFn } from "./process-fn";

export interface DeviceSpec {
	readonly inputs: Record<string, number | number[]>;
	readonly config: Record<string, ConfigValue>;
	readonly outputs: readonly string[];
	readonly defaultInput: string;
	readonly defaultOutput: string;
	readonly positionalArgs?: readonly string[];
	readonly process?: ProcessFn;
	readonly processAll?: ProcessAllFn;
	readonly wasmUrl?: string;
	/**
	 * If true, device handles poly internally instead of being expanded.
	 * Used for mix, spread, etc.
	 */
	readonly polyphonic?: boolean;
	/**
	 * Custom expansion hook for devices that create multiple nodes.
	 * Called during expandPoly. Returns descriptors which are converted to nodes.
	 */
	readonly expand?: (
		config: Record<string, ConfigValue>,
		inputs: Record<string, NodeInput>,
	) => WrappedNode | WrappedNode[];
}
