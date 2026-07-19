/**
 * Structural identity — the hash that lets live re-eval migrate state.
 * id(node) = fnv1a of (module, effective config JSON minus functions,
 * per-port recursive source ids). Computed in topo order so every plain
 * dependency already has an id; z-edge sources are described shallowly
 * (module:port) to keep the recursion well-founded across cycles.
 *
 * Patch-defined (defmod) modules additionally fold their tick/state SOURCE
 * into the hash: unchanged source → identical id → state migrates across
 * re-runs; a changed tick is a different machine → fresh state (unless
 * pinned). Bundled modules' hashing is untouched.
 */

import { isLambdaInput, isNodeRef, isZRef } from "../graph/input-kinds";
import type { GNode, InputValue } from "../graph/node";
import { type SpecTable, resolveSpec } from "../module/resolve";

/** `order` must be topologically sorted (z-edges cut). */
export function structuralIds(order: readonly GNode[], specs?: SpecTable): Map<GNode, string> {
	const ids = new Map<GNode, string>();
	for (const node of order) ids.set(node, idOf(node, ids, specs));
	return ids;
}

function idOf(node: GNode, ids: Map<GNode, string>, specs?: SpecTable): string {
	const spec = resolveSpec(node.module, specs);
	const config = stableStringify({ ...spec.config, ...node.config });
	const ports = Object.keys(spec.ins)
		.sort()
		.map((port) => `${port}=${sourceDesc(node.inputs[port], spec.ins[port]?.def ?? null, ids)}`);
	const src = specs?.has(node.module)
		? `|src:${fnv1a(spec.tick.toString() + (spec.state?.toString() ?? ""))}`
		: "";
	return `n${fnv1a(`${node.module}|${config}|${ports.join(",")}${src}`)}`;
}

function sourceDesc(
	value: InputValue | undefined,
	def: number | null,
	ids: Map<GNode, string>,
): string {
	if (value === undefined) return `c:${def}`;
	if (typeof value === "number") return `c:${value}`;
	if (isLambdaInput(value)) return `l:${fnv1a(value.lambda.toString())}`;
	if (isNodeRef(value)) return `n:${ids.get(value.node)}:${value.port}:${value.lane ?? "*"}`;
	if (isZRef(value)) return `z:${value.z.node.module}:${value.z.port}`;
	return "p:?"; // patterns are expanded before ids are computed
}

/** Deterministic JSON: sorted keys, function values dropped. */
export function stableStringify(value: unknown): string {
	if (value === null || typeof value === "number" || typeof value === "boolean")
		return String(value);
	if (typeof value === "string") return JSON.stringify(value);
	if (typeof value === "function" || value === undefined) return "";
	if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
	const obj = value as Record<string, unknown>;
	const entries = Object.keys(obj)
		.sort()
		.filter((k) => typeof obj[k] !== "function" && obj[k] !== undefined)
		.map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`);
	return `{${entries.join(",")}}`;
}

export function fnv1a(s: string): string {
	let h = 0x811c9dc5;
	for (let i = 0; i < s.length; i++) {
		h ^= s.charCodeAt(i);
		h = Math.imul(h, 0x01000193);
	}
	return (h >>> 0).toString(16).padStart(8, "0");
}
