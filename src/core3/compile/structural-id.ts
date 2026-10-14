/**
 * Structural identity — the hash that lets live re-eval migrate state.
 * id(node) = fnv1a of (module, per-port source description). Identity is
 * module type + wiring (MANIFESTO §6.2): a wired port names its source's id
 * and port; a constant or unconnected port is just "constant" and a lambda
 * just "lambda" (stateless, so its source is not identity either). Constant
 * values and the node's config are NOT identity, so `lpf(800)` → `lpf(900)`
 * keeps the filter's state and everything downstream. (A module whose own
 * config changed, or whose state no longer fits, starts fresh alone at
 * migration — runtime/initial-states.ts.) Computed in topo
 * order so every plain dependency already has an id; z-edge sources are
 * described shallowly (module:port) to keep the recursion well-founded.
 *
 * Patch-defined (defmod) modules additionally fold their tick/state SOURCE
 * into the hash: unchanged source → identical id → state migrates across
 * re-runs; a changed tick is a different machine → fresh state (unless
 * pinned).
 */

import { isLambdaInput, isNodeRef, isZRef } from "../graph/input-kinds";
import { fnv1a32 } from "../hash/fnv1a32";
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
	const ports = Object.keys(spec.ins)
		.sort()
		.map((port) => `${port}=${sourceDesc(node.inputs[port], ids)}`);
	const src = specs?.has(node.module)
		? `|src:${fnv1a(spec.tick.toString() + (spec.state?.toString() ?? ""))}`
		: "";
	return `n${fnv1a(`${node.module}|${ports.join(",")}${src}`)}`;
}

function sourceDesc(value: InputValue | undefined, ids: Map<GNode, string>): string {
	if (value === undefined || typeof value === "number") return "c";
	if (isLambdaInput(value)) return "l";
	if (isNodeRef(value)) return `n:${ids.get(value.node)}:${value.port}:${value.lane ?? "*"}`;
	if (isZRef(value)) return `z:${value.z.node.module}:${value.z.port}`;
	return "p:?"; // patterns are expanded before ids are computed
}

export function fnv1a(s: string): string {
	return fnv1a32(s).toString(16).padStart(8, "0");
}
