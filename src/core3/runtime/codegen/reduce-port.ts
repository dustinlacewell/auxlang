/**
 * One reduce-node input port for one sample. A connected port refills its
 * preallocated lane view (the source's own lanes) with one baked slot-local
 * read per lane and its value is the view; a constant is baked; a lambda is
 * called. `name` is the scope name the view or lambda is bound under.
 */

import { GATHER_CONST, GATHER_CUR, GATHER_LAMBDA, type PortGather } from "../gathers";
import type { DriverScope } from "./driver-scope";
import { emitLambdaCall } from "./emit-lambda-call";
import { numLiteral } from "./js-literal";
import { prevLocal, slotLocal } from "./name-table";

export interface ReducePort {
	readonly fill: readonly string[];
	readonly value: string;
}

export function reducePort(p: PortGather, name: string, scope: DriverScope): ReducePort {
	if (p.kind === GATHER_CONST) return { fill: [], value: numLiteral(p.constValue) };
	if (p.kind === GATHER_LAMBDA)
		return { fill: [], value: emitLambdaCall(scope.bind(name, p.lambda)) };
	const view = scope.bind(name, p.view);
	return { fill: viewFill(p, view), value: view };
}

function viewFill(p: PortGather, view: string): string[] {
	const local = p.kind === GATHER_CUR ? slotLocal : prevLocal;
	const width = (p.view as Float32Array).length;
	const lines: string[] = [];
	for (let l = 0; l < width; l++) lines.push(`${view}[${l}] = ${local(p.base + l)};`);
	return lines;
}
