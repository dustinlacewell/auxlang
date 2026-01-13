/**
 * The flat graph produced by the API.
 *
 * A flat list of nodes that reference each other by ID.
 * Output nodes are identified by device type "out".
 */

import type { Node } from "./node";

export interface FlatGraph {
	readonly nodes: readonly Node[];
}
