/**
 * The value expression for one map-node input of one lane: a baked constant,
 * the source slot's value ("n": this sample, "z": the previous one, read
 * through `slots`), or a call of a lambda bound into the scope under
 * `lambdaName`.
 */

import { BIND_CONST, BIND_CUR, BIND_LAMBDA, BIND_PREV, type LaneBindings } from "../bindings";
import type { DriverScope } from "./driver-scope";
import { emitLambdaCall } from "./emit-lambda-call";
import { numLiteral } from "./js-literal";
import type { SlotAccess } from "./slot-access";

export function laneSource(
	b: LaneBindings,
	j: number,
	lambdaName: string,
	scope: DriverScope,
	slots: SlotAccess,
): string {
	const kind = b.kinds[j];
	switch (kind) {
		case BIND_CONST:
			return numLiteral(b.consts[j]);
		case BIND_CUR:
			return slots.cur(b.offsets[j] as number);
		case BIND_PREV:
			return slots.prev(b.offsets[j] as number);
		case BIND_LAMBDA:
			return emitLambdaCall(scope.bind(lambdaName, b.lambdas[j]));
	}
	throw new Error(`codegen: unknown binding kind ${kind} for input '${b.names[j]}'`);
}
