/**
 * Reduce-node input gathers: per input port, in spec order. A connected port
 * refills its preallocated lane view (the source's own lanes, never copied
 * across a wider port's) with one baked slot read per lane, then hands the
 * view to the ins record. Constants are baked; lambdas are called.
 */

import {
	GATHER_CONST,
	GATHER_CUR,
	GATHER_LAMBDA,
	type PortGather,
	type ReduceGathers,
} from "../gathers";
import type { DriverScope } from "./driver-scope";
import { emitLambdaCall } from "./emit-lambda-call";
import { numLiteral, propKey } from "./js-literal";

export function emitReduceGathers(
	g: ReduceGathers,
	ins: string,
	prefix: string,
	scope: DriverScope,
): string[] {
	return g.ports.flatMap((p, j) => emitPortGather(p, ins, `${prefix}_${j}`, scope));
}

function emitPortGather(p: PortGather, ins: string, name: string, scope: DriverScope): string[] {
	const target = `${ins}${propKey(p.name)}`;
	if (p.kind === GATHER_CONST) return [`${target} = ${numLiteral(p.constValue)};`];
	if (p.kind === GATHER_LAMBDA)
		return [`${target} = ${emitLambdaCall(scope.bind(name, p.lambda))};`];
	const view = scope.bind(name, p.view);
	return [...emitViewFill(p, view), `${target} = ${view};`];
}

function emitViewFill(p: PortGather, view: string): string[] {
	const buf = p.kind === GATHER_CUR ? "cur" : "prv";
	const width = (p.view as Float32Array).length;
	const lines: string[] = [];
	for (let l = 0; l < width; l++)
		lines.push(`${view}[${l}] = ${buf}[${p.base + l}];`);
	return lines;
}
