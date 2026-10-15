/**
 * Binding a user value to a named input port: a unit tag converts to the
 * port's unit; anything else lifts as-is (an untagged value means the port's
 * unit and is never rejected for it).
 */

import type { InputValue } from "../graph/node";
import type { ModulePorts, PortAnn } from "../types";
import { isUnitTag } from "../units/tag";
import { convertTag } from "./convert-tag";
import { lift } from "./lift";

export function bindInput(spec: ModulePorts, port: string, value: unknown): InputValue {
	const where = `${spec.name}.${port}`;
	if (isUnitTag(value)) return convertTag(value, spec.ins[port] as PortAnn, where);
	return lift(value, where);
}
