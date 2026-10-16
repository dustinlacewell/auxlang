/** A plain object that is not itself a signal value: a named-args bag, or a port group's members. */

import { isGNode } from "../graph/input-kinds";
import { isUnitTag } from "../units/tag";
import { isHandle } from "./handle-data";

export function isNamedArgs(v: unknown): v is Record<string, unknown> {
	if (typeof v !== "object" || v === null || Array.isArray(v)) return false;
	if (isHandle(v) || isGNode(v) || isUnitTag(v)) return false;
	const ast = (v as Record<string, unknown>).ast;
	if (typeof ast === "object" && ast !== null) return false; // P-like pattern
	return true;
}
