/**
 * Call-site map-node input gathers for one lane: one straight-line
 * assignment per input port, in spec order, into the node's reused ins
 * record.
 */

import type { LaneBindings } from "../bindings";
import type { DriverScope } from "./driver-scope";
import { propKey } from "./js-literal";
import { laneSource } from "./lane-source";

export function emitLaneGathers(
	b: LaneBindings,
	ins: string,
	lambdaPrefix: string,
	scope: DriverScope,
): string[] {
	return b.names.map(
		(name, j) => `${ins}${propKey(name)} = ${laneSource(b, j, `${lambdaPrefix}_${j}`, scope)};`,
	);
}
