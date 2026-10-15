/**
 * Modulation terms become plain arithmetic nodes: a port with `.mod` terms is
 * rebound to `base + Σ(signal × depth)`, built from the registry's `add` and
 * `mul` modules. A depth of exactly 1 skips the `mul`. The base is the port's
 * set value, else its declared default; a port with neither (required) has
 * nothing to modulate and is a loud error. Runs early in compile, so the new
 * nodes go through pattern expansion, clocks, widths, and ids like any other.
 * The new nodes live in the modulated node's sub-patch scope, if any.
 */

import type { GNode, InputValue, ModTerm } from "../graph/node";
import { type Scope, scoped } from "../graph/scope";
import { type SpecTable, resolveSpec } from "../module/resolve";
import type { PortAnn } from "../types";

/** Desugars mods in place; each node's `mods` is consumed. */
export function expandMods(nodes: readonly GNode[], specs?: SpecTable): void {
	for (const node of nodes) {
		if (node.mods === undefined) continue;
		for (const [port, terms] of Object.entries(node.mods)) {
			const ann = () => resolveSpec(node.module, specs).ins[port];
			node.inputs[port] = modulated(node, port, ann, terms);
		}
		// biome-ignore lint/performance/noDelete: compile-time, once per node; `mods` must be absent afterwards
		delete node.mods;
	}
}

/**
 * `base + Σ(signal × depth)` for one port of `node`. `ann` gives the port's
 * declared annotation; it is read only when the port has no set value.
 */
export function modulated(
	node: GNode,
	port: string,
	ann: () => PortAnn | undefined,
	terms: readonly ModTerm[],
): InputValue {
	return terms.reduce(
		(sum, term) => arithmetic("add", { in: sum, to: scaled(term, node.scope) }, node.scope),
		baseOf(node, port, ann),
	);
}

function baseOf(node: GNode, port: string, ann: () => PortAnn | undefined): InputValue {
	const set = node.inputs[port];
	if (set !== undefined) return set;
	const def = ann()?.def ?? null;
	if (def === null) {
		throw new Error(
			`${node.module}.mod('${port}', ...): '${port}' has no base value to modulate — set it first`,
		);
	}
	return def;
}

function scaled(term: ModTerm, scope: Scope | undefined): InputValue {
	if (term.depth === 1) return term.signal;
	return arithmetic("mul", { in: term.signal, by: term.depth }, scope);
}

function arithmetic(
	module: string,
	inputs: Record<string, InputValue>,
	scope: Scope | undefined,
): InputValue {
	return { node: { module, inputs, config: {}, ...scoped(scope) }, port: "out" };
}
