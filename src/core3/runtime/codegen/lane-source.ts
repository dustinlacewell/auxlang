/**
 * The value expression for one map-node input of one lane: a baked constant,
 * the source slot's local ("n": this sample, "z": the previous one), or a
 * call of a lambda bound into the scope under `lambdaName`.
 */

import { BIND_CONST, BIND_CUR, BIND_LAMBDA, BIND_PREV, type LaneBindings } from "../bindings";
import type { DriverScope } from "./driver-scope";
import { emitLambdaCall } from "./emit-lambda-call";
import { numLiteral } from "./js-literal";
import { prevLocal, slotLocal } from "./name-table";

export function laneSource(
	b: LaneBindings,
	j: number,
	lambdaName: string,
	scope: DriverScope,
): string {
	const kind = b.kinds[j];
	switch (kind) {
		case BIND_CONST:
			return numLiteral(b.consts[j]);
		case BIND_CUR:
			return slotLocal(b.offsets[j] as number);
		case BIND_PREV:
			return prevLocal(b.offsets[j] as number);
		case BIND_LAMBDA:
			return emitLambdaCall(scope.bind(lambdaName, b.lambdas[j]));
	}
	throw new Error(`codegen: unknown binding kind ${kind} for input '${b.names[j]}'`);
}
