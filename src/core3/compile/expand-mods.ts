/**
 * Modulation terms become plain arithmetic nodes: a port with `.mod` terms is
 * rebound to `base + Σ(signal × depth)`, built from the registry's `add` and
 * `mul` modules. A depth of exactly 1 skips the `mul`. The base is the port's
 * set value, else its declared default; a port with neither (required) has
 * nothing to modulate and is a loud error. Runs first in compile, so the new
 * nodes go through pattern expansion, clocks, widths, and ids like any other.
 */

import type { GNode, InputValue, ModTerm } from "../graph/node";
import { type SpecTable, resolveSpec } from "../module/resolve";

/** Desugars mods in place; each node's `mods` is consumed. */
export function expandMods(nodes: readonly GNode[], specs?: SpecTable): void {
	for (const node of nodes) {
		if (node.mods === undefined) continue;
		for (const [port, terms] of Object.entries(node.mods)) {
			node.inputs[port] = terms.reduce(addTerm, baseOf(node, port, specs));
		}
		// biome-ignore lint/performance/noDelete: compile-time, once per node; `mods` must be absent afterwards
		delete node.mods;
	}
}

function baseOf(node: GNode, port: string, specs?: SpecTable): InputValue {
	const set = node.inputs[port];
	if (set !== undefined) return set;
	const def = resolveSpec(node.module, specs).ins[port]?.def ?? null;
	if (def === null) {
		throw new Error(
			`${node.module}.mod('${port}', ...): '${port}' has no base value to modulate — set it first`,
		);
	}
	return def;
}

function addTerm(sum: InputValue, term: ModTerm): InputValue {
	return arithmetic("add", { in: sum, to: scaled(term) });
}

function scaled(term: ModTerm): InputValue {
	if (term.depth === 1) return term.signal;
	return arithmetic("mul", { in: term.signal, by: term.depth });
}

function arithmetic(module: string, inputs: Record<string, InputValue>): InputValue {
	return { node: { module, inputs, config: {} }, port: "out" };
}
