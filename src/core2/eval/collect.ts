/**
 * Collect the FlatGraph from GraphBuilder after code execution.
 */

import type { FlatGraph } from "../graph/flat-graph";
import { getBuilder } from "../graph/graph-builder";

export function collect(): FlatGraph {
	return getBuilder().build();
}
