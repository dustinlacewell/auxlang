/**
 * Output scatter for one (node, lane): each out port's value lands in its
 * slot's local, in spec order. `value(j)` is the expression for out port j.
 */

import type { NodeRun } from "../node-run";
import { slotLocal } from "./name-table";

export function emitScatter(run: NodeRun, lane: number, value: (j: number) => string): string[] {
	return run.outPorts.map(
		(_, j) => `${slotLocal((run.outBases[j] as number) + lane)} = ${value(j)};`,
	);
}
