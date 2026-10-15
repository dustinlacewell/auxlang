/**
 * Call-site reduce-node input gathers: per input port, in spec order, fill
 * the port (reduce-port.ts: the source's own lanes, never copied across a
 * wider port's) and hand its value to the ins record.
 */

import type { ReduceGathers } from "../gathers";
import type { DriverScope } from "./driver-scope";
import { propKey } from "./js-literal";
import { reducePort } from "./reduce-port";

export function emitReduceGathers(
	g: ReduceGathers,
	ins: string,
	prefix: string,
	scope: DriverScope,
): string[] {
	return g.ports.flatMap((p, j) => {
		const port = reducePort(p, `${prefix}_${j}`, scope);
		return [...port.fill, `${ins}${propKey(p.name)} = ${port.value};`];
	});
}
