/**
 * Discriminators for the InputValue union and for raw GNode objects.
 */

import type { GNode, InputValue, LambdaInput, NodeRef, PatternInput, ZRef } from "./node";

export function isNodeRef(v: InputValue | undefined): v is NodeRef {
	return typeof v === "object" && v !== null && "node" in v && "port" in v;
}

export function isZRef(v: InputValue | undefined): v is ZRef {
	return typeof v === "object" && v !== null && "z" in v;
}

export function isLambdaInput(v: InputValue | undefined): v is LambdaInput {
	return typeof v === "object" && v !== null && "lambda" in v;
}

export function isPatternInput(v: InputValue | undefined): v is PatternInput {
	return typeof v === "object" && v !== null && "pattern" in v;
}

export function isGNode(v: unknown): v is GNode {
	if (typeof v !== "object" || v === null) return false;
	const o = v as Record<string, unknown>;
	return typeof o.module === "string" && typeof o.inputs === "object" && o.inputs !== null;
}
