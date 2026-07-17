/**
 * Signal lifting — every value a user can pass as an input becomes an
 * InputValue. Accepted: number, Handle, raw GNode, function (per-sample
 * lambda), or a P-like pattern (duck-typed: has an `.ast` object with a
 * string `op`). Anything else fails loudly.
 */

import { getModule } from "../module/define";
import { isGNode } from "../graph/input-kinds";
import type { InputValue, NodeRef } from "../graph/node";
import { type HandleData, handleData, isHandle } from "./handle-data";

export function lift(value: unknown, where: string): InputValue {
	if (typeof value === "number") {
		if (!Number.isFinite(value)) throw new Error(`${where}: ${value} is not a finite number`);
		return value;
	}
	if (isHandle(value)) return refFromHandle(handleData(value));
	if (isGNode(value)) {
		return { node: value, port: getModule(value.module).defaultOut };
	}
	if (typeof value === "function") {
		return { lambda: value as (...args: unknown[]) => number };
	}
	if (isPatternLike(value)) {
		return { pattern: (value as { ast: unknown }).ast };
	}
	throw new Error(
		`${where}: cannot use ${describe(value)} as a signal. ` +
			`Expected a number, a handle, a per-sample lambda, or a pattern.`,
	);
}

export function refFromHandle(data: HandleData): NodeRef {
	const port = data.port ?? getModule(data.node.module).defaultOut;
	return { node: data.node, port, ...(data.lane !== undefined ? { lane: data.lane } : {}) };
}

function isPatternLike(v: unknown): boolean {
	if (typeof v !== "object" || v === null) return false;
	const ast = (v as Record<string, unknown>).ast;
	return typeof ast === "object" && ast !== null && typeof (ast as Record<string, unknown>).op === "string";
}

function describe(v: unknown): string {
	if (v === null) return "null";
	if (v === undefined) return "undefined";
	if (Array.isArray(v)) return "an array";
	return `a ${typeof v} (${String(v).slice(0, 40)})`;
}
