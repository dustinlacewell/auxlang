/**
 * Output scatter for one (node, lane): each out port's value lands in its
 * baked slot of `cur`, in spec order.
 */

import type { NodeRun } from "../node-run";
import { propKey } from "./js-literal";

export function emitScatter(run: NodeRun, outs: string, lane: number): string[] {
	return run.outPorts.map(
		(port, j) => `cur[${(run.outBases[j] as number) + lane}] = ${outs}${propKey(port)};`,
	);
}
