/**
 * Map-node input gathers for one lane: one straight-line assignment per input
 * port, in spec order, into the node's reused ins record. Constants are baked
 * literals; "n"/"z" sources are baked slot reads of `cur`/`prv`; lambdas are
 * bound into the scope and called.
 */

import { BIND_CONST, BIND_CUR, BIND_LAMBDA, BIND_PREV, type LaneBindings } from "../bindings";
import type { DriverScope } from "./driver-scope";
import { emitLambdaCall } from "./emit-lambda-call";
import { numLiteral, propKey } from "./js-literal";

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

function laneSource(b: LaneBindings, j: number, lambdaName: string, scope: DriverScope): string {
	const kind = b.kinds[j];
	switch (kind) {
		case BIND_CONST:
			return numLiteral(b.consts[j]);
		case BIND_CUR:
			return `cur[${b.offsets[j]}]`;
		case BIND_PREV:
			return `prv[${b.offsets[j]}]`;
		case BIND_LAMBDA:
			return emitLambdaCall(scope.bind(lambdaName, b.lambdas[j]));
	}
	throw new Error(`codegen: unknown binding kind ${kind} for input '${b.names[j]}'`);
}
