/**
 * A node ready for runtime execution.
 */

import type { NodeId } from "../graph/node";
import type { ConfigValue } from "../signal/config-value";
import type { ResolvedSource } from "./resolved-source";

export interface RuntimeNode {
	readonly id: NodeId;
	readonly device: string;
	readonly inputSources: Record<string, ResolvedSource>;
	readonly config: Record<string, ConfigValue>;
}
