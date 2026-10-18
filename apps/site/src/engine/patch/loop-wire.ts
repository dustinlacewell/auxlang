/**
 * One fed-back wire: a `z1` placeholder that the body reads, and the z-edge
 * that closes it once the body's output is known (read one sample late).
 */

import type { GNode } from "../graph/node";
import { getModule } from "../dsp/define";
import type { HandleData } from "./handle-data";
import { refFromHandle } from "./lift";
import { newNode } from "./new-node";

export function feedbackPlaceholder(): GNode {
	return newNode("z1", {}, {});
}

/** Wire `source` back into `placeholder` as a z-edge; `start` is read before its first sample. */
export function feedInto(placeholder: GNode, source: HandleData, where: string, start = 0): void {
	const { node, port } = refFromHandle(source, where);
	const z = start === 0 ? { node, port } : { node, port, start };
	placeholder.inputs[getModule("z1").defaultIn] = { z };
}
