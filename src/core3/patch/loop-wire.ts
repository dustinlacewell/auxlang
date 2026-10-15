/**
 * One fed-back wire: a `z1` placeholder that the body reads, and the z-edge
 * that closes it once the body's output is known (read one sample late).
 */

import type { GNode } from "../graph/node";
import { getModule } from "../module/define";
import type { HandleData } from "./handle-data";
import { refFromHandle } from "./lift";

export function feedbackPlaceholder(): GNode {
	return { module: "z1", inputs: {}, config: {} };
}

/** Wire `source` back into `placeholder` as a z-edge. */
export function feedInto(placeholder: GNode, source: HandleData, where: string): void {
	const { node, port } = refFromHandle(source, where);
	placeholder.inputs[getModule("z1").defaultIn] = { z: { node, port } };
}
