/**
 * Reset all evaluation state for a fresh run.
 */

import { clearRegistry } from "../device/registry";
import { resetNodeCounter } from "../graph/create-node";
import { resetBuilder } from "../graph/graph-builder";

export function reset(): void {
	resetBuilder();
	resetNodeCounter();
	// Note: don't clear device registry - devices are registered once at module load
}
