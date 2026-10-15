/**
 * Sub-patch expansion (MANIFESTO §5): every sub-patch instance reachable from
 * the roots becomes plain nodes, before anything else in compile. Each round
 * expands the instances in reach and splices them out; an instance built
 * inside another comes into reach in the next round. Nothing of a sub-patch
 * reaches the program but its inner nodes, so the engine needs no sub-graph
 * concept.
 */

import type { GNode, InputValue } from "../../graph/node";
import type { EvalResult } from "../../patch/context";
import { findSubpatch } from "../../patch/subpatch/find-subpatch";
import type { SubpatchSpec } from "../../patch/subpatch/subpatch-spec";
import { collect } from "../collect";
import { expandInstance } from "./expand-instance";
import { type Aliases, spliceAliases } from "./splice-aliases";

export function expandSubpatches(result: EvalResult): void {
	for (let found = instancesInReach(result); found.length > 0; found = instancesInReach(result)) {
		spliceAliases(result.roots, aliasesOf(found, result));
	}
}

function instancesInReach(result: EvalResult): [GNode, SubpatchSpec][] {
	return collect(result.roots).flatMap((node) => {
		const spec = findSubpatch(node.module, result.subpatches);
		return spec === undefined ? [] : [[node, spec] as [GNode, SubpatchSpec]];
	});
}

function aliasesOf(found: readonly [GNode, SubpatchSpec][], result: EvalResult): Aliases {
	const aliases = new Map<GNode, Readonly<Record<string, InputValue>>>();
	for (const [instance, spec] of found) {
		const { outputs, standIns } = expandInstance(instance, spec, result);
		aliases.set(instance, outputs);
		for (const [node, value] of standIns) aliases.set(node, { out: value });
	}
	return aliases;
}
