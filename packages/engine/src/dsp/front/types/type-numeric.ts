/**
 * An expression whose value is computed on: an operand, a test, a branch of
 * a kept `?:`/`&&`/`||`/`??`, a returned value. Only a number or boolean
 * stands there; an array or record (or a parameter record) is reached by
 * name, stored, passed or indexed, never computed on, so there it is used as
 * a number (unify.ts STRUCTURED_OPERAND).
 */

import type { AnyNode } from "acorn";
import type { PlanContext, Position } from "./plan-context";
import { type Ty, isStructured } from "./ty";
import { typeExpr } from "./type-expression";

export function typeNumeric(c: PlanContext, node: AnyNode, pos: Position): Ty {
	const ty = typeExpr(c, node, pos);
	if (isStructured(ty)) c.events.push({ k: "operand", node });
	return ty;
}
